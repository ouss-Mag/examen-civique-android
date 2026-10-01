# Keep the methods called from JavaScript
-keepattributes JavascriptInterface
-keepclassmembers class com.magdi.examencivique.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
