import html2canvas from "html2canvas";
import { toast } from "sonner";

/**
 * Capture any HTML card element as a PNG image and share/download it to gallery or native apps.
 * @param {HTMLElement} element - The DOM element of the card to capture.
 * @param {string} title - Title of the position or event.
 * @param {string} candidateName - Name of the candidate/winner.
 */
export async function shareResultCard(element, title = "SDPS Election Results", candidateName = "") {
  if (!element) {
    toast.error("Card element not ready for sharing.");
    return;
  }

  const toastId = toast.loading("🎨 Generating card image...");

  try {
    // Render high resolution canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (clonedDoc, clonedEl) => {
        // Hide elements with data-no-share attribute in cloned snapshot
        const noShareEls = clonedEl.querySelectorAll("[data-no-share]");
        noShareEls.forEach(el => { el.style.display = "none"; });
      }
    });

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1.0));
    if (!blob) {
      toast.error("Failed to generate image", { id: toastId });
      return;
    }

    const safeTitle = (title || "Result").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeName = (candidateName || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `SDPS_Result_${safeTitle}${safeName ? "_" + safeName : ""}.png`;
    const file = new File([blob], fileName, { type: "image/png" });

    // 1. Try Native Web Share API (Mobile WhatsApp, Instagram, Save to Photos/Gallery)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      toast.dismiss(toastId);
      await navigator.share({
        title: `SDPS Student Council — ${title}`,
        text: candidateName ? `Congratulations to ${candidateName} for ${title}! S.D. Public School Patna.` : `SDPS Student Council Election Results: ${title}`,
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
      toast.error("Could not share card. Try saving image.", { id: toastId });
    } else {
      toast.dismiss(toastId);
    }
  }
}
