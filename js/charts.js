(function (global) {
  "use strict";

  const PALETTE = [
    "#4f46e5",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#14b8a6"
  ];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatCurrency(val) {
    return "NT$ " + Math.round(val).toLocaleString("zh-TW");
  }

  function formatCompactAxis(val) {
    if (val === 0) return "0";
    if (val >= 10000) {
      const wan = val / 10000;
      return Number.isInteger(wan) ? wan + "萬" : wan.toFixed(1) + "萬";
    }
    return val.toLocaleString("zh-TW");
  }

  function setupCanvas(canvas) {
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(260, Math.floor(rect.width));
    const height = Math.max(180, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
  }

  function drawRoundedBar(ctx, x, y, w, h, r) {
    if (h <= 0) return;
    const radius = Math.min(r, w / 2, h);
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
  }

  function renderRevenueChart(canvas, tooltipEl, records) {
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    ctx.clearRect(0, 0, width, height);

    const sorted = (records || []).slice().sort((a, b) => a.month - b.month);
    if (sorted.length === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = '500 14px "Noto Sans TC", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("此年度尚無營業額紀錄", width / 2, height / 2);
      canvas._chartMeta = null;
      return;
    }

    const pad = { top: 24, right: 20, bottom: 38, left: 60 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const maxRaw = Math.max(
      100000,
      ...sorted.map((r) => Math.max(Number(r.actual) || 0, Number(r.target) || 0))
    );
    const stepBase = Math.pow(10, Math.floor(Math.log10(maxRaw)));
    const maxY = Math.ceil((maxRaw * 1.15) / (stepBase * 0.5)) * (stepBase * 0.5);

    const hitRegions = [];
    const slotW = plotW / sorted.length;
    const barW = Math.max(12, Math.min(36, slotW * 0.52));

    function drawFrame(hoverIndex) {
      ctx.clearRect(0, 0, width, height);

      // 橫向格線與 Y 軸刻度
      const ticks = 4;
      ctx.font = '500 11px "Noto Sans TC", sans-serif';
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      for (let i = 0; i <= ticks; i++) {
        const val = (maxY / ticks) * i;
        const y = pad.top + plotH - (plotH * i) / ticks;

        ctx.strokeStyle = i === 0 ? "#cbd5e1" : "#e2e8f0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();

        ctx.fillStyle = "#64748b";
        ctx.fillText(formatCompactAxis(val), pad.left - 8, y);
      }

      // 柱狀圖（實際營業額）
      hitRegions.length = 0;
      const linePoints = [];

      sorted.forEach((item, idx) => {
        const actual = Number(item.actual) || 0;
        const target = Number(item.target) || 0;
        const centerX = pad.left + slotW * idx + slotW / 2;
        const barH = (actual / maxY) * plotH;
        const barX = centerX - barW / 2;
        const barY = pad.top + plotH - barH;

        const isHovered = idx === hoverIndex;
        const metTarget = actual >= target;

        if (isHovered) {
          ctx.fillStyle = "rgba(79, 70, 229, 0.08)";
          ctx.fillRect(pad.left + slotW * idx + 2, pad.top, slotW - 4, plotH);
        }

        ctx.fillStyle = isHovered
          ? (metTarget ? "#059669" : "#4338ca")
          : (metTarget ? "#10b981" : "#4f46e5");
        drawRoundedBar(ctx, barX, barY, barW, barH, 6);

        // X 軸月份標籤
        ctx.fillStyle = isHovered ? "#0f172a" : "#64748b";
        ctx.font = isHovered
          ? '700 12px "Noto Sans TC", sans-serif'
          : '500 11px "Noto Sans TC", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(item.month + "月", centerX, pad.top + plotH + 10);

        const targetY = pad.top + plotH - (target / maxY) * plotH;
        linePoints.push({ x: centerX, y: targetY });

        hitRegions.push({
          idx,
          xStart: pad.left + slotW * idx,
          xEnd: pad.left + slotW * (idx + 1),
          tipX: centerX,
          tipY: Math.min(barY, targetY) - 8,
          item
        });
      });

      // 目標營業額折線
      if (linePoints.length > 0) {
        ctx.save();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        linePoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();

        linePoints.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, idx === hoverIndex ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#f59e0b";
          ctx.stroke();
        });
      }

      // 圖例
      ctx.font = '500 11px "Noto Sans TC", sans-serif';
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      const legendItems = [
        { label: "達標月份", color: "#10b981" },
        { label: "未達標月份", color: "#4f46e5" },
        { label: "目標線", color: "#f59e0b" }
      ];
      let lx = pad.left;
      const ly = 10;
      legendItems.forEach((lg) => {
        ctx.fillStyle = lg.color;
        ctx.fillRect(lx, ly - 4, 10, 8);
        ctx.fillStyle = "#475569";
        ctx.fillText(lg.label, lx + 14, ly);
        lx += ctx.measureText(lg.label).width + 28;
      });
    }

    drawFrame(-1);

    canvas.onmousemove = function (e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (my < pad.top || my > height - pad.bottom) {
        drawFrame(-1);
        if (tooltipEl) tooltipEl.classList.remove("visible");
        return;
      }

      const found = hitRegions.find((r) => mx >= r.xStart && mx <= r.xEnd);
      if (!found) {
        drawFrame(-1);
        if (tooltipEl) tooltipEl.classList.remove("visible");
        return;
      }

      drawFrame(found.idx);
      if (tooltipEl) {
        const { month, actual, target } = found.item;
        const rate = target > 0 ? Math.round((actual / target) * 100) : 0;
        tooltipEl.innerHTML =
          "<strong>" + month + " 月營業額</strong><br>" +
          "實際：" + formatCurrency(actual) + "<br>" +
          "目標：" + formatCurrency(target) + " (" + rate + "%)";
        const clampedX = Math.max(70, Math.min(width - 70, found.tipX));
        const clampedY = Math.max(54, found.tipY);
        tooltipEl.style.left = clampedX + "px";
        tooltipEl.style.top = clampedY + "px";
        tooltipEl.classList.add("visible");
      }
    };

    canvas.onmouseleave = function () {
      drawFrame(-1);
      if (tooltipEl) tooltipEl.classList.remove("visible");
    };
  }

  function renderDonutChart(canvas, tooltipEl, legendEl, items) {
    if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    ctx.clearRect(0, 0, width, height);

    const validItems = (items || []).filter((it) => it.value > 0);
    const total = validItems.reduce((sum, it) => sum + it.value, 0);

    if (legendEl) legendEl.innerHTML = "";

    if (total === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = '500 14px "Noto Sans TC", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("尚無客戶合作金額資料", width / 2, height / 2);
      return;
    }

    const cx = width / 2;
    const cy = height / 2;
    const outerR = Math.min(width, height) * 0.42;
    const innerR = outerR * 0.6;

    const slices = [];
    let angle = -Math.PI / 2;

    validItems.forEach((it, idx) => {
      const sweep = (it.value / total) * Math.PI * 2;
      slices.push({
        label: it.label,
        value: it.value,
        percent: (it.value / total) * 100,
        color: PALETTE[idx % PALETTE.length],
        start: angle,
        end: angle + sweep
      });
      angle += sweep;
    });

    function drawDonut(hoverIndex) {
      ctx.clearRect(0, 0, width, height);

      slices.forEach((s, idx) => {
        const isHovered = idx === hoverIndex;
        const r = isHovered ? outerR + 6 : outerR;

        ctx.beginPath();
        ctx.arc(cx, cy, r, s.start, s.end);
        ctx.arc(cx, cy, innerR, s.end, s.start, true);
        ctx.closePath();
        ctx.fillStyle = s.color;
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // 中央總計文字
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#64748b";
      ctx.font = '500 11px "Noto Sans TC", sans-serif';
      ctx.fillText("累計合作總額", cx, cy - 10);

      ctx.fillStyle = "#0f172a";
      ctx.font = '700 15px "Noto Sans TC", sans-serif';
      ctx.fillText(formatCompactAxis(total), cx, cy + 10);
    }

    drawDonut(-1);

    if (legendEl) {
      slices.forEach((s) => {
        const li = document.createElement("li");
        li.innerHTML =
          '<span class="legend-left">' +
          '<span class="legend-dot" style="background:' + s.color + '"></span>' +
          '<span class="legend-name"></span>' +
          "</span>" +
          '<span class="legend-val">' + s.percent.toFixed(1) + "%</span>";
        li.querySelector(".legend-name").textContent = s.label;
        legendEl.appendChild(li);
      });
    }

    canvas.onmousemove = function (e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dx = mx - cx;
      const dy = my - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < innerR || dist > outerR + 8) {
        drawDonut(-1);
        if (tooltipEl) tooltipEl.classList.remove("visible");
        return;
      }

      let theta = Math.atan2(dy, dx);
      if (theta < -Math.PI / 2) theta += Math.PI * 2;

      const idx = slices.findIndex((s) => theta >= s.start && theta <= s.end);
      if (idx === -1) {
        drawDonut(-1);
        if (tooltipEl) tooltipEl.classList.remove("visible");
        return;
      }

      const slice = slices[idx];
      drawDonut(idx);
      if (tooltipEl) {
        tooltipEl.innerHTML =
          "<strong>" + escapeHtml(slice.label) + "</strong><br>" +
          formatCurrency(slice.value) + " (" + slice.percent.toFixed(1) + "%)";
        tooltipEl.style.left = Math.max(70, Math.min(width - 70, mx)) + "px";
        tooltipEl.style.top = Math.max(48, my - 10) + "px";
        tooltipEl.classList.add("visible");
      }
    };

    canvas.onmouseleave = function () {
      drawDonut(-1);
      if (tooltipEl) tooltipEl.classList.remove("visible");
    };
  }

  global.CompanyCharts = {
    renderRevenueChart,
    renderDonutChart,
    formatCurrency
  };
})(window);
