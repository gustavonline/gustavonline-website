import { familyHref } from "./family/preview";

// Project names, icons and copy come from the generated GitHub profile data.

export const siteData = {
  brand: "gustavonline" as const,
  navBrand: "gustavonline",
  name: "Gustav Anderson",
  portrait: "/assets/gustav-linkedin-portrait.jpg",
  identityMark: "/assets/gustav-pixel-g-384.png",
  email: "hello@gustavonline.com",
  themeStorageKey: "gustavonline-theme",
  seo: {
    homeTitle: "gustavonline | Gustav Anderson",
    newsletterTitle: "Newsletter | gustavonline",
    description:
      "Work, ideas and experiments with data, AI and software. By Gustav Anderson.",
    newsletterDescription:
      "Notes and ideas from putting data, AI and software to work. By Gustav Anderson.",
    ogTitle: "gustavonline | Gustav Anderson",
    ogImage: "/assets/gustav-linkedin-portrait.jpg",
  },
  profile: {
    intro: "Founder",
  },
  selectedWork: {
    title: "Current work",
    moreTitle: "More projects",
  },
  newsletter: {
    label: "Notes from the work",
    support: "Notes and ideas from putting data, AI and software to work.",
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
        description: "Resources and ongoing collaboration to make data and AI useful in your business.",
        label: "onlinesourdough",
        href: familyHref("onlinesourdough"),
      },
      {
        description: "Data and AI consultancy shaped around your business.",
        label: "Arc’IT AI",
        href: familyHref("arcitai"),
      },
      {
        description: "Notes and ideas from putting data, AI and software to work.",
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
