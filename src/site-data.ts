import type { WritingPost } from "../shared/contracts/content";

export const siteData = {
  brand: "gustavonline",
  navBrand: "gustavonline",
  name: "Gustav Anderson",
  portrait: "assets/gustav-portrait.jpg",
  logo: "assets/g-logo.png",
  email: "hello@gustavonline.com",
  themeStorageKey: "gustavonline-theme",
  seo: {
    title: "gustavonline | IT architect and onlinesourdough",
    description:
      "I'm an IT architect building a consultancy. gustavonline is where I document everyday work, learning and the thinking behind onlinesourdough.com. onlinesourdough.com is for content, resources and direct access; arcitai.com is for done-for-you projects.",
    ogTitle: "gustavonline - Gustav Anderson",
    ogImage: "assets/gustav-portrait.jpg",
  },
  profile: {
    intro:
      "I'm an IT architect building a consultancy - gustavonline is my space for sharing real decisions and the thinking behind onlinesourdough.com.",
    noteLine: "I try to post content here",
  },
  newsletter: {
    label: "Daily notes, thoughts and resources",
    placeholder: "hello@gustavonline.com",
    idle: "Check your inbox for a confirmation email. Unsubscribe anytime.",
    loading: "Submitting...",
    success: "You are on the list.",
    error: "Signup ran into an error.",
  },
  writing: {
    label: "notes",
    loadingLabel: "Checking notes",
    fallbackPosts: [
      {
        title: "onlinesourdough.com",
        summary:
          "Content, resources and direct access for connecting IT, software and business before quick code becomes something the business depends on.",
        date: "Draft",
        url: "https://onlinesourdough.com",
      },
      {
        title: "arcitai.com",
        summary:
          "The done-for-you consultancy for IT architecture, software projects, automations and systems that need to be built and handed over properly.",
        date: "Idea",
        url: "https://arcitai.com",
      },
      {
        title: "AI needs architecture",
        summary:
          "AI should help people become more productive. It still needs architecture, workflow context and careful choices to avoid supermarket-framework debt.",
        date: "Coming soon",
        url: "#newsletter",
      },
    ] satisfies WritingPost[],
  },
  footer: {
    copyright: "© 2026 gustavonline",
  },
  floatingCards: [
    {
      src: "assets/quote-card.png",
      alt: "I wanna see what happens if I don't give up",
      variant: "quote",
    },
    {
      src: "assets/office-sun-desk.jpg",
      alt: "Sunlit office desk setup",
      variant: "office-sun",
    },
    {
      src: "assets/orange-gradient.jpg",
      alt: "Golden orange gradient",
      variant: "gradient",
    },
    {
      src: "assets/office-ai-desk.jpg",
      alt: "Office desk with laptop and light",
      variant: "office-ai",
    },
    {
      src: "assets/macintosh.jpg",
      alt: "Macintosh-inspired setup",
      variant: "macintosh",
    },
    {
      src: "assets/office-window-desk.jpg",
      alt: "Window-side office desk setup",
      variant: "office-window",
    },
  ],
  links: {
    actions: [
      {
        title: "Content, resources and direct access",
        label: "onlinesourdough.com",
        href: "https://onlinesourdough.com",
      },
      {
        title: "Done-for-you agency service",
        label: "arcitai.com",
        href: "https://arcitai.com",
      },
      {
        title: "My open source repos",
        label: "github/gustavonline",
        href: "https://github.com/stars/gustavonline/lists/templates",
      },
      {
        title: "Collaborations? Email me",
        label: "hello@gustavonline.com",
        href: "mailto:hello@gustavonline.com",
      },
    ],
    social: [
      {
        label: "YouTube",
        href: "https://www.youtube.com/@gustavonline",
        icon: "youtube",
      },
      {
        label: "Instagram",
        href: "https://www.instagram.com/gustavonline/",
        icon: "instagram",
      },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/gustavonline/",
        icon: "linkedin",
      },
    ],
    footerSocial: [
      {
        label: "YouTube",
        href: "https://www.youtube.com/@gustavonline",
        icon: "youtube",
      },
      {
        label: "Instagram",
        href: "https://www.instagram.com/gustavonline/",
        icon: "instagram",
      },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/gustavonline/",
        icon: "linkedin",
      },
      {
        label: "GitHub",
        href: "https://github.com/gustavonline",
        icon: "github",
      },
    ],
  },
};
