import { siteData } from "../../../site-data";
import { SocialLinks } from "./SocialLinks";

export function ProfileSection() {
  return (
    <section className="profile-section" aria-label="Profile">
      <div className="name-row">
        <img src={siteData.portrait} alt={siteData.name} />
        <div>
          <h1>{siteData.name}</h1>
          <p className="intro-copy">{siteData.profile.intro}</p>
        </div>
      </div>
      <SocialLinks />
    </section>
  );
}
