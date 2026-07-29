import html2canvas from "html2canvas";
import { toast } from "sonner";

/**
 * Capture an individual candidate/position card as a standalone PNG image and share/download it to gallery or native apps.
 * @param {HTMLElement} element - The DOM element of the card to capture.
 * @param {string} title - Title of the position or event.
 * @param {string} candidateName - Name of the candidate/winner.
 */
export async function shareResultCard(element, title = "SDPS Election Results", candidateName = "") {
  if (!element) {
    toast.error("Card element not ready for sharing.");
    return;
  }

  const toastId = toast.loading("🎨 Generating candidate card image...");

  try {
    // Render high resolution canvas
    const canvas = await html2canvas(element, {
      scale: 3, // Crisp 3x retina quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (clonedDoc, clonedEl) => {
        // Hide buttons marked with data-no-share in cloned snapshot
        const noShareEls = clonedEl.querySelectorAll("[data-no-share]");
        noShareEls.forEach(el => { el.style.display = "none"; });

        // Add sleek SDPS header banner to cloned card snapshot if not already present
        if (!clonedEl.querySelector(".sdps-share-branding")) {
          const brandHeader = clonedDoc.createElement("div");
          brandHeader.className = "sdps-share-branding";
          brandHeader.style.cssText = `
            background: linear-gradient(135deg, #0E3B91, #1A55B6);
            color: #ffffff;
            padding: 10px 16px;
            border-top-left-radius: 16px;
            border-top-right-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-family: system-ui, -apple-system, sans-serif;
            margin-bottom: 12px;
          `;
          brandHeader.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:900; font-size:12px; letter-spacing:1px; text-transform:uppercase;">S.D. PUBLIC SCHOOL, PATNA</span>
            </div>
            <span style="font-size:10px; font-weight:700; background:rgba(255,255,255,0.2); padding:3px 8px; border-radius:12px;">STUDENT COUNCIL 2026-27</span>
          `;
          clonedEl.insertBefore(brandHeader, clonedEl.firstChild);
        }
      }
    });

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1.0));
    if (!blob) {
      toast.error("Failed to generate card image", { id: toastId });
      return;
    }

    const safeTitle = (title || "Result").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeName = (candidateName || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `SDPS_${safeTitle}${safeName ? "_" + safeName : ""}.png`;
    const file = new File([blob], fileName, { type: "image/png" });

    // 1. Try Native Web Share API (WhatsApp, Instagram, Save to Photos/Gallery)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      toast.dismiss(toastId);
      await navigator.share({
        title: `SDPS Council — ${candidateName || title}`,
        text: candidateName ? `Congratulations ${candidateName} for ${title}! S.D. Public School Patna.` : `SDPS Student Council 2026-27: ${title}`,
        files: [file],
      });
      toast.success("Card shared successfully!");
      return;
    }

    // 2. Direct Download to Gallery / Downloads
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("📸 Card image saved to your downloads / gallery!", { id: toastId });
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Share card error:", err);
      toast.error("Could not share card. Image downloaded to gallery.", { id: toastId });
    } else {
      toast.dismiss(toastId);
    }
  }
}
