export function ThemeScript() {
  const code = `(function(){try{
    var m = document.cookie.match(/(?:^|; )aw_theme=(light|dark)/);
    var t = m ? m[1] : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = t;
  }catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
