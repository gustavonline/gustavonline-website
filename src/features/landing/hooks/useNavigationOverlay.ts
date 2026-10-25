import { useEffect, type RefObject } from "react";

/** Keeps a full-screen navigation overlay separate from the page behind it. */
export function useNavigationOverlay(open: boolean, root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const navigation = root.current;
    if (!open || !navigation) return;
    const header = navigation.closest("header")!;
    const previousTop = navigation.style.getPropertyValue("--navigation-top");
    const align = () => navigation.style.setProperty("--navigation-top", `${header.getBoundingClientRect().bottom}px`);
    const size = new ResizeObserver(align);
    size.observe(header);
    align();
    const page = document.documentElement;
    const body = document.body;
    const previous = { page: page.style.overflow, body: body.style.overflow, gutter: page.style.scrollbarGutter };
    const outside: { element: HTMLElement; inert: boolean }[] = [];
    // Exclude siblings at every level, never an ancestor containing the overlay.
    let branch: HTMLElement = navigation;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling === branch || !(sibling instanceof HTMLElement)) continue;
        if (["SCRIPT", "STYLE", "LINK"].includes(sibling.tagName)) continue;
        outside.push({ element: sibling, inert: sibling.inert });
        sibling.setAttribute("inert", "");
      }
      branch = branch.parentElement;
    }
    // Preserve the reading width on systems with permanently visible scrollbars.
    if (window.innerWidth > page.clientWidth) page.style.scrollbarGutter = "stable";
    page.style.overflow = "hidden";
    // Clip avoids creating a second scroll container that would unstick the header.
    body.style.overflow = "clip";
    function containTab(event: KeyboardEvent) {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      const controls = [...navigation!.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]',
      )].filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert], [hidden]'));
      const first = controls[0], last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", containTab);
    return () => {
      document.removeEventListener("keydown", containTab);
      size.disconnect();
      if (previousTop) navigation.style.setProperty("--navigation-top", previousTop);
      else navigation.style.removeProperty("--navigation-top");
      for (const { element, inert } of outside) {
        if (inert) element.setAttribute("inert", "");
        else element.removeAttribute("inert");
      }
      page.style.overflow = previous.page;
      page.style.scrollbarGutter = previous.gutter;
      body.style.overflow = previous.body;
    };
  }, [open, root]);
}
