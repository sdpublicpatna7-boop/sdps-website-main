import html2canvas from "html2canvas";
import { toast } from "sonner";

/**
 * Capture an individual candidate/position card as a standalone PNG image and share/download it to gallery or native apps.
 * Formatted in a clean 4:5 aspect ratio optimized for social media (Instagram, WhatsApp, Facebook).
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

  const toastId = toast.loading("🎨 Generating social media poster image...");

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

        // Format snapshot into a clean 4:5 social media poster ratio (540px width container)
        clonedEl.style.width = "540px";
        clonedEl.style.maxWidth = "540px";
        clonedEl.style.margin = "0 auto";
        clonedEl.style.padding = "0";
        clonedEl.style.borderRadius = "24px";
        clonedEl.style.overflow = "hidden";
        clonedEl.style.background = "#ffffff";
        clonedEl.style.boxShadow = "0 10px 30px rgba(0,0,0,0.08)";
        clonedEl.style.border = "1px solid #cbd5e1";
        clonedEl.style.fontFamily = "system-ui, -apple-system, sans-serif";

        // Ensure winner cards are horizontal, compact, and balanced
        const winnerCards = clonedEl.querySelectorAll(".bg-slate-50\\/80, .bg-slate-50\\/60");
        winnerCards.forEach(card => {
          card.style.display = "flex";
          card.style.flexDirection = "row";
          card.style.alignItems = "center";
          card.style.justifyContent = "space-between";
          card.style.textAlign = "left";
          card.style.padding = "14px 18px";
          card.style.gap = "16px";

          // Ensure inner winner content flexes horizontally
          const innerContent = card.firstElementChild;
          if (innerContent) {
            innerContent.style.display = "flex";
            innerContent.style.flexDirection = "row";
            innerContent.style.alignItems = "center";
            innerContent.style.textAlign = "left";
            innerContent.style.gap = "16px";
            innerContent.style.width = "100%";
          }
          const textBlock = card.querySelector(".text-center");
          if (textBlock) {
            textBlock.style.textAlign = "left";
          }
        });

        // Ensure candidate breakdown list is compact 2-columns with clean spacing
        const candGrid = clonedEl.querySelector(".grid-cols-1, .grid-cols-2");
        if (candGrid) {
          candGrid.style.display = "grid";
          candGrid.style.gridTemplateColumns = "1fr 1fr";
          candGrid.style.gap = "8px";
        }

        // Add sleek SDPS Social Media Banner at top (prevents title overlap)
        if (!clonedEl.querySelector(".sdps-share-branding")) {
          const brandHeader = clonedDoc.createElement("div");
          brandHeader.className = "sdps-share-branding";
          brandHeader.style.cssText = `
            background: linear-gradient(135deg, #0E3B91 0%, #1A55B6 100%);
            color: #ffffff;
            padding: 14px 18px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 4px;
            margin-bottom: 12px;
          `;
          brandHeader.innerHTML = `
            <div style="font-weight: 900; font-size: 14px; letter-spacing: 1.5px; text-transform: uppercase; color: #ffffff; line-height: 1.2;">
              S.D. PUBLIC SCHOOL, PATNA
            </div>
            <div style="font-size: 9px; font-weight: 800; color: #F4D571; letter-spacing: 1.5px; text-transform: uppercase; background: rgba(255,255,255,0.15); padding: 3px 12px; border-radius: 12px; border: 1px solid rgba(244,213,113,0.3);">
              OFFICIAL STUDENT COUNCIL 2026–27
            </div>
          `;
          clonedEl.insertBefore(brandHeader, clonedEl.firstChild);
        }

        // Add sleek Footer Watermark at bottom
        if (!clonedEl.querySelector(".sdps-share-footer")) {
          const brandFooter = clonedDoc.createElement("div");
          brandFooter.className = "sdps-share-footer";
          brandFooter.style.cssText = `
            background: #0E3B91;
            color: #ffffff;
            padding: 10px 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 12px;
          `;
          brandFooter.innerHTML = `
            <span>⭐ SDPS ANNOUNCEMENT</span>
            <span style="color: #F4D571;">WWW.SDPUBLIC.ORG</span>
          `;
          clonedEl.appendChild(brandFooter);
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
    const fileName = `SDPS_Poster_${safeTitle}${safeName ? "_" + safeName : ""}.png`;
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
        title: `SDPS Council Poster — ${title}`,
        text: shareText,
        files: [file],
      });
      toast.success("Social media poster shared!");
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

    toast.success("📸 Poster image saved to your gallery / downloads!", { id: toastId });
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Share card error:", err);
      toast.error("Could not share poster. Image downloaded to gallery.", { id: toastId });
    } else {
      toast.dismiss(toastId);
    }
  }
}
