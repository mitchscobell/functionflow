namespace TodoApi.Models;

/// <summary>
/// Available UI color themes. Stored on <see cref="User.ThemePreference"/>
/// and applied via CSS classes on the frontend.
/// </summary>
public enum Theme
{
    /// <summary>Warm terracotta tones (#B67B5E accent, #FEF9EF bg).</summary>
    Function,

    /// <summary>Dark palette with indigo accent (#818CF8 accent, #0F1117 bg).</summary>
    Dark,

    /// <summary>Clean bright palette with blue accent (#2563EB accent, #FAFAFA bg).</summary>
    Light,

    /// <summary>Retro neon pink/cyan on dark purple (#FF6AD5 accent, #1A1025 bg).</summary>
    Vaporwave,

    /// <summary>Electric cyan/magenta on deep dark (#00F0FF accent, #0A0A12 bg).</summary>
    Cyberpunk
}
