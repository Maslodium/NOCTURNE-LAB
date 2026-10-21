using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

[assembly: AssemblyTitle("NOCTURNE Wallpaper")]
[assembly: AssemblyDescription("GPU-accelerated animated wallpaper editor")]
[assembly: AssemblyCompany("NOCTURNE / LAB")]
[assembly: AssemblyProduct("NOCTURNE / LAB")]
[assembly: AssemblyVersion("2.5.4.0")]
[assembly: AssemblyFileVersion("2.5.4.0")]

internal static class Program
{
    private static void Extract(Assembly assembly, string resourceName, string targetPath)
    {
        using (Stream input = assembly.GetManifestResourceStream(resourceName))
        {
            if (input == null)
                throw new InvalidOperationException("Embedded resource is missing: " + resourceName);

            using (FileStream output = new FileStream(targetPath, FileMode.Create, FileAccess.Write, FileShare.Read))
                input.CopyTo(output);
        }
    }

    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            Assembly assembly = Assembly.GetExecutingAssembly();
            string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NocturneLab");
            Directory.CreateDirectory(folder);

            string htmlPath = Path.Combine(folder, "wallpaper-studio-v2.html");
            string iconPath = Path.Combine(folder, "nocturne-wallpaper-mark.svg");
            Extract(assembly, "Nocturne.Wallpaper.html", htmlPath);
            Extract(assembly, "Nocturne.Wallpaper.svg", iconPath);

            Process.Start(new ProcessStartInfo(htmlPath) { UseShellExecute = true });
            return 0;
        }
        catch (Exception error)
        {
            MessageBox.Show(error.Message, "NOCTURNE / LAB", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
