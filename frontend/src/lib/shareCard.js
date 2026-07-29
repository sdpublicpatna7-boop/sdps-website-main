import html2canvas from "html2canvas";
import { toast } from "sonner";

/**
 * Capture an individual candidate/position card as a standalone PNG image and share/download it to gallery or native apps.
 * @param {HTMLElement} element - The DOM element of the card to capture.
 * @param {string} title - Title of the position or event.
 * @param {string} candidateName - Name of the primary candidate/captain.
 * @param {string} viceName - Optional name of the vice captain/co-winner.
 */
export async function shareResultCard(element, title = "SDPS Election Results", candidateName = "", viceName = "") {
  if (!element) {
    toast.error("Card element not ready for sharing.");
    return;
  }

  const toastId = toast.loading("🎨 Generating card image...");

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

        // Add sleek stacked SDPS header banner (prevents title overlap)
        if (!clonedEl.querySelector(".sdps-share-branding")) {
          const brandHeader = clonedDoc.createElement("div");
          brandHeader.className = "sdps-share-branding";
          brandHeader.style.cssText = `
            background: linear-gradient(135deg, #0E3B91 0%, #1A55B6 100%);
            color: #ffffff;
            padding: 12px 16px;
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 4px;
            font-family: system-ui, -apple-system, sans-serif;
            margin-bottom: 14px;
            box-shadow: 0 4px 12px rgba(14, 59, 145, 0.15);
          `;
          brandHeader.innerHTML = `
            <div style="font-weight: 900; font-size: 13px; letter-spacing: 1.2px; text-transform: uppercase; color: #ffffff; line-height: 1.2;">
              S.D. PUBLIC SCHOOL, PATNA
            </div>
            <div style="font-size: 9px; font-weight: 800; color: #F4D571; letter-spacing: 1.5px; text-transform: uppercase; background: rgba(255,255,255,0.15); padding: 3px 10px; border-radius: 12px; border: 1px solid rgba(244,213,113,0.3);">
              STUDENT COUNCIL 2026–27
            </div>
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

    // Format share message to wish BOTH Captain & Vice Captain if present
    let shareText = "";
    if (candidateName && viceName) {
      shareText = `🎉 Congratulations to ${candidateName} (Captain) & ${viceName} (Vice Captain) for ${title}! S.D. Public School Patna.`;
    } else if (candidateName) {
      shareText = `🎉 Congratulations to ${candidateName} for ${title}! S.D. Public School Patna.`;
    } else {
      shareText = `Official S.D. Public School Patna Student Council 2026-27: ${title}`;
    }

    // 1. Try Native Web Share API (WhatsApp, Instagram, Save to Photos/Gallery)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      toast.dismiss(toastId);
      await navigator.share({
        title: `SDPS Council — ${title}`,
        text: shareText,
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
