package expo.modules.relaisnative

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.net.Uri
import android.provider.ContactsContract
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File

class ReadOptions : Record {
  /** Timestamp (ms) : ne renvoie que les messages reçus après cette date */
  @Field val sinceMs: Double = 0.0

  /** Timestamp (ms) : ne renvoie que les messages reçus avant cette date (0 = pas de limite) */
  @Field val untilMs: Double = 0.0

  /** Filtre optionnel sur le numéro de l'expéditeur */
  @Field val address: String? = null

  @Field val limit: Int = 300
}

class RelaisNativeModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context indisponible" }

  private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

  private fun granted(permission: String) =
    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

  /** Compare deux numéros en ignorant le format (+33 6… / 06…) */
  private fun sameNumber(a: String?, b: String?): Boolean {
    if (a == null || b == null) return false
    val da = a.filter { it.isDigit() }
    val db = b.filter { it.isDigit() }
    if (da.isEmpty() || db.isEmpty()) return a.trim().equals(b.trim(), ignoreCase = true)
    val n = minOf(9, da.length, db.length)
    return da.takeLast(n) == db.takeLast(n)
  }

  private val contactCache = HashMap<String, String?>()

  private fun contactName(number: String?): String? {
    if (number.isNullOrBlank() || !granted(Manifest.permission.READ_CONTACTS)) return null
    contactCache[number]?.let { return it }
    var name: String? = null
    try {
      val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number))
      context.contentResolver.query(uri, arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME), null, null, null)?.use { c ->
        if (c.moveToFirst()) name = c.getString(0)
      }
    } catch (_: Exception) {
    }
    contactCache[number] = name
    return name
  }

  /** Décode une image (file:// ou content://) en bitmap, ou null si illisible. */
  private fun decodeBitmap(uri: Uri): Bitmap? {
    return try {
      context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
        ?: uri.path?.let { BitmapFactory.decodeFile(it) }
    } catch (_: Exception) {
      null
    }
  }

  /**
   * Léger renforcement de contraste avant l'OCR (couleur conservée, pas de
   * passage en niveaux de gris qui pourrait fusionner texte/fond de même
   * luminance). Aide sur les photos pâles ou un peu sombres.
   */
  private fun enhanceForOcr(src: Bitmap): Bitmap {
    val c = 1.15f
    val t = (-0.5f * c + 0.5f) * 255f // garde le point milieu stable
    val cm = ColorMatrix(
      floatArrayOf(
        c, 0f, 0f, 0f, t,
        0f, c, 0f, 0f, t,
        0f, 0f, c, 0f, t,
        0f, 0f, 0f, 1f, 0f
      )
    )
    val out = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
    val paint = Paint().apply {
      isAntiAlias = true
      colorFilter = ColorMatrixColorFilter(cm)
    }
    Canvas(out).drawBitmap(src, 0f, 0f, paint)
    if (src != out) src.recycle()
    return out
  }

  override fun definition() = ModuleDefinition {
    Name("RelaisNative")

    Function("hasSmsPermission") { granted(Manifest.permission.READ_SMS) }

    Function("hasContactsPermission") { granted(Manifest.permission.READ_CONTACTS) }

    // ---------- SMS ----------
    AsyncFunction("readSms") { options: ReadOptions ->
      if (!granted(Manifest.permission.READ_SMS)) {
        throw SecurityException("Permission READ_SMS refusée")
      }
      val result = ArrayList<Map<String, Any?>>()
      val selection = StringBuilder("date >= ?")
      val args = arrayListOf(options.sinceMs.toLong().toString())
      if (options.untilMs > 0) {
        selection.append(" AND date <= ?")
        args.add(options.untilMs.toLong().toString())
      }
      context.contentResolver.query(
        Uri.parse("content://sms/inbox"),
        arrayOf("_id", "address", "body", "date"),
        selection.toString(),
        args.toTypedArray(),
        "date DESC"
      )?.use { c ->
        while (c.moveToNext() && result.size < options.limit) {
          val address = c.getString(1)
          if (!options.address.isNullOrBlank() && !sameNumber(address, options.address)) continue
          result.add(
            mapOf(
              "id" to "sms-" + c.getLong(0),
              "address" to address,
              "name" to contactName(address),
              "body" to (c.getString(2) ?: ""),
              "date" to c.getLong(3).toDouble(),
              "images" to emptyList<String>()
            )
          )
        }
      }
      result
    }

    // ---------- MMS (images envoyées par SMS) ----------
    AsyncFunction("readMms") { options: ReadOptions ->
      if (!granted(Manifest.permission.READ_SMS)) {
        throw SecurityException("Permission READ_SMS refusée")
      }
      val resolver = context.contentResolver
      val result = ArrayList<Map<String, Any?>>()
      // La date des MMS est stockée en secondes
      val selection = StringBuilder("date >= ? AND msg_box = 1")
      val args = arrayListOf((options.sinceMs.toLong() / 1000).toString())
      if (options.untilMs > 0) {
        selection.append(" AND date <= ?")
        args.add((options.untilMs.toLong() / 1000).toString())
      }
      val outDir = File(context.cacheDir, "mms").apply { mkdirs() }

      resolver.query(
        Uri.parse("content://mms"),
        arrayOf("_id", "date"),
        selection.toString(),
        args.toTypedArray(),
        "date DESC"
      )?.use { c ->
        while (c.moveToNext() && result.size < options.limit) {
          val id = c.getLong(0)
          val dateMs = c.getLong(1) * 1000

          // Expéditeur (type 137 = FROM)
          var address: String? = null
          resolver.query(Uri.parse("content://mms/$id/addr"), arrayOf("address", "type"), "type = 137", null, null)?.use { a ->
            if (a.moveToFirst()) address = a.getString(0)
          }
          if (!options.address.isNullOrBlank() && !sameNumber(address, options.address)) continue

          val text = StringBuilder()
          val images = ArrayList<String>()
          resolver.query(Uri.parse("content://mms/part"), arrayOf("_id", "ct", "text"), "mid = ?", arrayOf(id.toString()), null)?.use { p ->
            while (p.moveToNext()) {
              val partId = p.getLong(0)
              val ct = p.getString(1) ?: ""
              when {
                ct == "text/plain" -> {
                  val t = p.getString(2)
                  if (!t.isNullOrBlank()) {
                    if (text.isNotEmpty()) text.append("\n")
                    text.append(t)
                  }
                }
                ct.startsWith("image/") -> {
                  val ext = when (ct) {
                    "image/png" -> "png"
                    "image/gif" -> "gif"
                    "image/webp" -> "webp"
                    else -> "jpg"
                  }
                  val out = File(outDir, "mms_${id}_$partId.$ext")
                  try {
                    if (!out.exists()) {
                      resolver.openInputStream(Uri.parse("content://mms/part/$partId"))?.use { input ->
                        out.outputStream().use { input.copyTo(it) }
                      }
                    }
                    if (out.exists() && out.length() > 0) images.add(Uri.fromFile(out).toString())
                  } catch (_: Exception) {
                  }
                }
              }
            }
          }
          if (text.isEmpty() && images.isEmpty()) continue
          result.add(
            mapOf(
              "id" to "mms-$id",
              "address" to address,
              "name" to contactName(address),
              "body" to text.toString(),
              "date" to dateMs.toDouble(),
              "images" to images
            )
          )
        }
      }
      result
    }

    // ---------- OCR sur l'appareil (ML Kit, hors ligne) ----------
    AsyncFunction("recognizeText") { uri: String, promise: Promise ->
      try {
        val bitmap = decodeBitmap(Uri.parse(uri))
          ?: throw IllegalArgumentException("Image illisible ou format non pris en charge.")
        val image = InputImage.fromBitmap(enhanceForOcr(bitmap), 0)
        recognizer.process(image)
          .addOnSuccessListener { r -> promise.resolve(r.text) }
          .addOnFailureListener { e -> promise.reject("ERR_OCR", e.message ?: "Échec de la reconnaissance", e) }
      } catch (e: Exception) {
        promise.reject("ERR_OCR", e.message ?: "Image illisible", e)
      }
    }
  }
}
