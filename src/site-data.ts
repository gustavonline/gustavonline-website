import { familyHref } from "./family/preview";

export const siteData = {
  brand: "gustavonline" as const,
  navBrand: "gustavonline",
  name: "Gustav Anderson",
  portrait: "/assets/gustav-portrait.jpg",
  identityMark: "/assets/gustav-pixel-g-384.png",
  email: "hello@gustavonline.com",
  themeStorageKey: "gustavonline-theme",
  seo: {
    homeTitle: "gustavonline | Gustav Anderson",
    newsletterTitle: "Newsletter | gustavonline",
    description:
      "Practical AI notes, experiments and tools for founders and business leaders by Gustav Anderson.",
    newsletterDescription:
      "Practical AI notes, experiments and tools for founders and business leaders from gustavonline.",
    ogTitle: "gustavonline | Gustav Anderson",
    ogImage: "/assets/gustav-portrait.jpg",
  },
  profile: {
    intro: "Founder",
  },
  newsletter: {
    label: "Notes on practical AI for founders & business leaders",
    support: "Experiments, workflows and tools for making AI useful in real business.",
    submitLabel: "Join free",
    placeholder: "Email address",
    loading: "Submitting...",
    success: "You are on the list.",
    error: "Signup ran into an error.",
  },
  writing: {
    label: "Notes",
    loadingLabel: "Checking notes",
  },
  floatingCards: [
    {
      src: "/assets/quote-card.png",
      alt: "I wanna see what happens if I don't give up",
      variant: "quote",
    },
    {
      src: "/assets/office-sun-desk.jpg",
      alt: "Sunlit office desk setup",
      variant: "office-sun",
    },
    {
      src: "/assets/office-ai-desk.jpg",
      alt: "Office desk with laptop and light",
      variant: "office-ai",
    },
    {
      src: "/assets/macintosh.jpg",
      alt: "Macintosh-inspired setup",
      variant: "macintosh",
    },
    {
      src: "/assets/office-window-desk.jpg",
      alt: "Window-side office desk setup",
      variant: "office-window",
    },
    {
      src: "/assets/onlinesourdough-content-publishing-desk-640.png",
      alt: "OnlineSourdough content publishing desk",
      variant: "pixel-content",
    },
    {
      src: "/assets/onlinesourdough-complete-bake-workstation-640.png",
      alt: "OnlineSourdough Complete Bake workstation",
      variant: "pixel-bake",
    },
    {
      src: "/assets/arcitai-city-workshop-640.jpg",
      alt: "Arc’IT AI city and workshop",
      variant: "arc-city",
    },
  ],
  links: {
    actions: [
      {
        description: "Practical AI resources and hands-on guidance.",
        label: "onlinesourdough",
        href: familyHref("onlinesourdough"),
      },
      {
        description: "Done-for-you AI and secure software",
        label: "Arc’IT AI",
        href: familyHref("arcitai"),
      },
      { description: "AI Infrastructure and Tools", label: "Kastanje Lab", href: "https://github.com/kastanje-labs" },
      {
        description: "Experiments, workflows and tools for making AI useful in real business.",
        label: "Newsletter",
        href: "/newsletter",
      },
      {
        description: "A retro music café with Elvis playlists and changing scenes.",
        label: "Elvis Presley Café",
        href: "https://gustavonline.github.io/elvispresley.cafe/",
      },
    ],
    social: [
      { label: "YouTube", href: "https://www.youtube.com/@gustavonline", icon: "youtube" },
      { label: "Instagram", href: "https://www.instagram.com/gustavonline/", icon: "instagram" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/gustavandersonn/", icon: "linkedin" },
      { label: "GitHub", href: "https://github.com/gustavonline", icon: "github" },
    ],
    footerSocial: [
      { label: "YouTube", href: "https://www.youtube.com/@gustavonline", icon: "youtube" },
      { label: "Instagram", href: "https://www.instagram.com/gustavonline/", icon: "instagram" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/gustavandersonn/", icon: "linkedin" },
      { label: "GitHub", href: "https://github.com/gustavonline", icon: "github" },
    ],
  },
};
