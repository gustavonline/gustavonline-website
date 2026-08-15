import { siteData } from "../../../site-data";
import { NewsletterForm } from "./NewsletterForm";
import { SocialLinks } from "./SocialLinks";

export function ProfileSection() {
  return (
    <section className="profile-section" aria-label="Profile">
      <div className="name-row">
        <h1>{siteData.name}</h1>
        <img src={siteData.portrait} alt={siteData.name} />
      </div>

      <p className="intro-copy">{siteData.profile.intro}</p>

      <div className="content-note">
        <SocialLinks />
      </div>

      <NewsletterForm />
    </section>
  );
}
