import { siteData } from "../../../site-data";
import { SocialLinks } from "./SocialLinks";

export function ProfileSection() {
  return (
    <section className="profile-section" aria-label="Profile">
      <div className="name-row">
        <img src={siteData.portrait} alt="" width="62" height="70" />
        <div>
          <h1>{siteData.name}</h1>
          <p className="profile-role">{siteData.profile.role}</p>
        </div>
      </div>
      <SocialLinks />
      <div className="profile-intro">
        <h2>{siteData.profile.headline}</h2>
        <p>{siteData.profile.intro}</p>
      </div>
    </section>
  );
}
