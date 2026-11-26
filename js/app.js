(function () {
  "use strict";

  const VIEW_META = {
    dashboard: {
      title: "首頁總覽",
      subtitle: "掌握公司營運概況與關鍵指標"
    },
    employees: {
      title: "員工資料管理",
      subtitle: "維護部門編制、職稱與員工聯絡資訊"
    },
    customers: {
      title: "客戶資料管理",
      subtitle: "追蹤企業客戶、聯絡窗口與合作金額"
    },
    revenue: {
      title: "營業額統計圖表",
      subtitle: "視覺化分析月度營收表現與各產業營收結構"
    }
  };

  let state = {
    data: window.CompanyStore.load(),
    currentView: "dashboard",
    selectedYear: null,
    pendingConfirm: null
  };

  function el(id) {
    return document.getElementById(id);
  }

  function formatCurrency(val) {
    return "NT$ " + Math.round(Number(val) || 0).toLocaleString("zh-TW");
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function statusClass(status) {
    if (status === "在職" || status === "合作中") return "status-success";
    if (status === "留職停薪" || status === "洽談中") return "status-warning";
    return "status-neutral";
  }

  function showToast(message) {
    const container = el("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2600);
  }

  function saveState() {
    window.CompanyStore.save(state.data);
  }

  function getAvailableYears() {
    const set = new Set(state.data.revenues.map((r) => Number(r.year)));
    if (set.size === 0) {
      set.add(new Date().getFullYear());
    }
    return Array.from(set).sort((a, b) => b - a);
  }

  function ensureSelectedYear() {
    const years = getAvailableYears();
    if (!state.selectedYear || !years.includes(state.selectedYear)) {
      state.selectedYear = years[0];
    }
  }

  // ---- 導覽與視窗控制 ----
  function switchView(viewName) {
    if (!VIEW_META[viewName]) return;
    state.currentView = viewName;

    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });
    document.querySelectorAll(".view").forEach((sec) => {
      sec.classList.toggle("active", sec.id === "view-" + viewName);
    });

    el("pageTitle").textContent = VIEW_META[viewName].title;
    el("pageSubtitle").textContent = VIEW_META[viewName].subtitle;

    closeMobileMenu();
    renderCurrentViewCharts();
  }

  function openMobileMenu() {
    el("sidebar").classList.add("open");
    el("sidebarBackdrop").classList.add("open");
  }

  function closeMobileMenu() {
    el("sidebar").classList.remove("open");
    el("sidebarBackdrop").classList.remove("open");
  }

  function openModal(modalId) {
    el(modalId).classList.add("open");
  }

  function closeModal(modalId) {
    el(modalId).classList.remove("open");
  }

  function openConfirm(title, message, onConfirm) {
    el("confirmModalTitle").textContent = title;
    el("confirmModalMessage").textContent = message;
    state.pendingConfirm = onConfirm;
    openModal("confirmModal");
  }

  // ---- 渲染：公司資訊與首頁 ----
  function renderCompanyInfo() {
    const c = state.data.company;
    el("sidebarCompanyName").textContent = c.name;
    el("heroCompanyName").textContent = c.name;
    el("heroCompanySlogan").textContent = c.slogan || "企業營運管理中心";
    document.title = c.name + " - 公司管理系統";

    const metaParts = [];
    if (c.taxId) metaParts.push("統一編號：" + c.taxId);
    if (c.phone) metaParts.push("聯絡電話：" + c.phone);
    if (c.email) metaParts.push("電子信箱：" + c.email);

    const metaEl = el("heroCompanyMeta");
    metaEl.innerHTML = "";
    metaParts.forEach((txt) => {
      const span = document.createElement("span");
      span.textContent = txt;
      metaEl.appendChild(span);
    });
  }

  function renderDashboard() {
    renderCompanyInfo();

    const employees = state.data.employees;
    const activeEmployees = employees.filter((e) => e.status === "在職").length;
    el("kpiEmployees").textContent = String(activeEmployees);
    el("kpiEmployeesSub").textContent = "總編制 " + employees.length + " 人";

    const customers = state.data.customers;
    const activeCustomers = customers.filter((c) => c.status === "合作中").length;
    el("kpiCustomers").textContent = String(activeCustomers);
    el("kpiCustomersSub").textContent = "總客戶 " + customers.length + " 家";

    const latestYear = getAvailableYears()[0];
    const yearRecords = state.data.revenues
      .filter((r) => Number(r.year) === latestYear)
      .sort((a, b) => a.month - b.month);

    const annualActual = yearRecords.reduce((sum, r) => sum + Number(r.actual || 0), 0);
    const annualTarget = yearRecords.reduce((sum, r) => sum + Number(r.target || 0), 0);
    const achieveRate = annualTarget > 0 ? Math.round((annualActual / annualTarget) * 100) : 0;

    el("kpiAnnualRevenue").textContent = formatCurrency(annualActual);
    el("kpiAnnualSub").textContent = latestYear + " 年目標達成率 " + achieveRate + "%";

    const growthEl = el("kpiMonthlyGrowth");
    growthEl.classList.remove("positive", "negative");

    if (yearRecords.length > 0) {
      const latest = yearRecords[yearRecords.length - 1];
      el("kpiMonthlyRevenue").textContent = formatCurrency(latest.actual);

      if (yearRecords.length >= 2) {
        const prev = yearRecords[yearRecords.length - 2];
        const diff = prev.actual > 0 ? ((latest.actual - prev.actual) / prev.actual) * 100 : 0;
        const sign = diff >= 0 ? "+" : "";
        growthEl.textContent =
          latestYear + " 年 " + latest.month + " 月（較上月 " + sign + diff.toFixed(1) + "%）";
        growthEl.classList.add(diff >= 0 ? "positive" : "negative");
      } else {
        growthEl.textContent = latestYear + " 年 " + latest.month + " 月紀錄";
      }
    } else {
      el("kpiMonthlyRevenue").textContent = formatCurrency(0);
      growthEl.textContent = "尚無月度紀錄";
    }

    // 營運快速摘要
    const summaryEl = el("recentSummaryList");
    summaryEl.innerHTML = "";

    const topEmployees = employees.slice(-2).reverse();
    const topCustomers = customers
      .slice()
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, 2);

    const items = [
      ...topEmployees.map((emp) => ({
        title: emp.name + "（" + emp.department + "）",
        sub: emp.role + " ・ 到職日 " + emp.hireDate,
        badge: emp.status,
        badgeCls: statusClass(emp.status)
      })),
      ...topCustomers.map((cus) => ({
        title: cus.company,
        sub: "窗口：" + cus.contact + " ・ " + formatCurrency(cus.value),
        badge: cus.status,
        badgeCls: statusClass(cus.status)
      }))
    ];

    if (items.length === 0) {
      summaryEl.innerHTML = '<div class="empty-state">尚無員工或客戶資料</div>';
    } else {
      items.forEach((it) => {
        const div = document.createElement("div");
        div.className = "summary-item";
        div.innerHTML =
          '<div>' +
          '<div class="summary-item-title">' + escapeHtml(it.title) + "</div>" +
          '<div class="summary-item-sub">' + escapeHtml(it.sub) + "</div>" +
          "</div>" +
          '<span class="status-badge ' + it.badgeCls + '">' + escapeHtml(it.badge) + "</span>";
        summaryEl.appendChild(div);
      });
    }

    if (state.currentView === "dashboard") {
      window.CompanyCharts.renderRevenueChart(
        el("dashboardRevenueCanvas"),
        el("dashboardChartTooltip"),
        yearRecords
      );
    }
  }

  // ---- 渲染：員工管理 ----
  function renderEmployeeFilters() {
    const deptSelect = el("employeeDeptFilter");
    const current = deptSelect.value;
    const depts = Array.from(new Set(state.data.employees.map((e) => e.department))).sort();

    deptSelect.innerHTML = '<option value="all">全部部門</option>';
    depts.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      deptSelect.appendChild(opt);
    });
    if (depts.includes(current)) {
      deptSelect.value = current;
    }
  }

  function renderEmployees() {
    renderEmployeeFilters();
    const q = el("employeeSearch").value.trim().toLowerCase();
    const dept = el("employeeDeptFilter").value;
    const status = el("employeeStatusFilter").value;

    const list = state.data.employees.filter((emp) => {
      if (dept !== "all" && emp.department !== dept) return false;
      if (status !== "all" && emp.status !== status) return false;
      if (!q) return true;
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q)
      );
    });

    const tbody = el("employeeTableBody");
    tbody.innerHTML = "";

    if (list.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-state">找不到符合條件的員工資料</td></tr>';
    } else {
      list.forEach((emp) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          '<td><div class="cell-main">' + escapeHtml(emp.name) + "</div></td>" +
          "<td>" + escapeHtml(emp.department) + "</td>" +
          "<td>" + escapeHtml(emp.role) + "</td>" +
          '<td><div class="cell-main">' + escapeHtml(emp.phone || "-") + '</div><div class="cell-sub">' + escapeHtml(emp.email) + "</div></td>" +
          "<td>" + escapeHtml(emp.hireDate) + "</td>" +
          '<td><span class="status-badge ' + statusClass(emp.status) + '">' + escapeHtml(emp.status) + "</span></td>" +
          '<td class="text-right"><div class="action-group">' +
          '<button class="btn btn-ghost btn-sm" data-edit-emp="' + escapeHtml(emp.id) + '" type="button">編輯</button>' +
          '<button class="btn btn-ghost btn-sm" data-del-emp="' + escapeHtml(emp.id) + '" type="button">刪除</button>' +
          "</div></td>";
        tbody.appendChild(tr);
      });
    }

    el("employeeCountText").textContent =
      "顯示 " + list.length + " 筆資料（共 " + state.data.employees.length + " 位員工）";
  }

  // ---- 渲染：客戶管理 ----
  function renderCustomerFilters() {
    const indSelect = el("customerIndustryFilter");
    const current = indSelect.value;
    const industries = Array.from(new Set(state.data.customers.map((c) => c.industry))).sort();

    indSelect.innerHTML = '<option value="all">全部產業</option>';
    industries.forEach((ind) => {
      const opt = document.createElement("option");
      opt.value = ind;
      opt.textContent = ind;
      indSelect.appendChild(opt);
    });
    if (industries.includes(current)) {
      indSelect.value = current;
    }
  }

  function renderCustomers() {
    renderCustomerFilters();
    const q = el("customerSearch").value.trim().toLowerCase();
    const ind = el("customerIndustryFilter").value;
    const status = el("customerStatusFilter").value;

    const list = state.data.customers.filter((cus) => {
      if (ind !== "all" && cus.industry !== ind) return false;
      if (status !== "all" && cus.status !== status) return false;
      if (!q) return true;
      return (
        cus.company.toLowerCase().includes(q) ||
        cus.contact.toLowerCase().includes(q) ||
        cus.industry.toLowerCase().includes(q) ||
        cus.email.toLowerCase().includes(q)
      );
    });

    const tbody = el("customerTableBody");
    tbody.innerHTML = "";

    if (list.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-state">找不到符合條件的客戶資料</td></tr>';
    } else {
      list.forEach((cus) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          '<td><div class="cell-main">' + escapeHtml(cus.company) + "</div></td>" +
          "<td>" + escapeHtml(cus.contact) + "</td>" +
          "<td>" + escapeHtml(cus.industry) + "</td>" +
          '<td><div class="cell-main">' + escapeHtml(cus.phone || "-") + '</div><div class="cell-sub">' + escapeHtml(cus.email) + "</div></td>" +
          '<td class="text-right"><strong>' + formatCurrency(cus.value) + "</strong></td>" +
          '<td><span class="status-badge ' + statusClass(cus.status) + '">' + escapeHtml(cus.status) + "</span></td>" +
          '<td class="text-right"><div class="action-group">' +
          '<button class="btn btn-ghost btn-sm" data-edit-cus="' + escapeHtml(cus.id) + '" type="button">編輯</button>' +
          '<button class="btn btn-ghost btn-sm" data-del-cus="' + escapeHtml(cus.id) + '" type="button">刪除</button>' +
          "</div></td>";
        tbody.appendChild(tr);
      });
    }

    el("customerCountText").textContent =
      "顯示 " + list.length + " 筆資料（共 " + state.data.customers.length + " 家客戶）";
  }

  // ---- 渲染：營業額統計 ----
  function renderRevenueView() {
    ensureSelectedYear();
    const years = getAvailableYears();
    const yearSelect = el("revenueYearSelect");
    yearSelect.innerHTML = "";
    years.forEach((y) => {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = y + " 年";
      yearSelect.appendChild(opt);
    });
    yearSelect.value = String(state.selectedYear);

    const records = state.data.revenues
      .filter((r) => Number(r.year) === state.selectedYear)
      .sort((a, b) => a.month - b.month);

    const totalActual = records.reduce((sum, r) => sum + Number(r.actual || 0), 0);
    const totalTarget = records.reduce((sum, r) => sum + Number(r.target || 0), 0);
    const achievement = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
    const avg = records.length > 0 ? totalActual / records.length : 0;

    let bestLabel = "--";
    if (records.length > 0) {
      const best = records.reduce((a, b) => (Number(b.actual) > Number(a.actual) ? b : a), records[0]);
      bestLabel = best.month + " 月 (" + formatCurrency(best.actual) + ")";
    }

    el("revSummaryTotal").textContent = formatCurrency(totalActual);
    el("revSummaryAchievement").textContent = achievement + "%";
    el("revSummaryAverage").textContent = formatCurrency(avg);
    el("revSummaryBest").textContent = bestLabel;

    // 明細表
    const tbody = el("revenueTableBody");
    tbody.innerHTML = "";
    if (records.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="empty-state">選定年度尚無營業額紀錄</td></tr>';
    } else {
      records.forEach((rec) => {
        const rate = rec.target > 0 ? Math.round((rec.actual / rec.target) * 100) : 0;
        const barWidth = Math.min(100, Math.max(0, rate));
        const tr = document.createElement("tr");
        tr.innerHTML =
          '<td><div class="cell-main">' + rec.year + " 年 " + rec.month + " 月</div></td>" +
          '<td class="text-right"><strong>' + formatCurrency(rec.actual) + "</strong></td>" +
          '<td class="text-right">' + formatCurrency(rec.target) + "</td>" +
          '<td><div class="progress-inline"><div class="progress-track"><div class="progress-fill ' +
          (rate >= 100 ? "done" : "") +
          '" style="width:' + barWidth + '%"></div></div><span>' + rate + "%</span></div></td>" +
          "<td>" + escapeHtml(rec.note || "-") + "</td>" +
          '<td class="text-right"><div class="action-group">' +
          '<button class="btn btn-ghost btn-sm" data-edit-rev="' + escapeHtml(rec.id) + '" type="button">編輯</button>' +
          '<button class="btn btn-ghost btn-sm" data-del-rev="' + escapeHtml(rec.id) + '" type="button">刪除</button>' +
          "</div></td>";
        tbody.appendChild(tr);
      });
    }

    if (state.currentView === "revenue") {
      renderRevenueCharts();
    }
  }

  function renderRevenueCharts() {
    ensureSelectedYear();
    const records = state.data.revenues
      .filter((r) => Number(r.year) === state.selectedYear)
      .sort((a, b) => a.month - b.month);

    window.CompanyCharts.renderRevenueChart(
      el("monthlyRevenueCanvas"),
      el("monthlyChartTooltip"),
      records
    );

    const industryMap = new Map();
    state.data.customers.forEach((c) => {
      const key = c.industry || "其他";
      industryMap.set(key, (industryMap.get(key) || 0) + (Number(c.value) || 0));
    });
    const categoryItems = Array.from(industryMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    window.CompanyCharts.renderDonutChart(
      el("categoryRevenueCanvas"),
      el("categoryChartTooltip"),
      el("categoryLegend"),
      categoryItems
    );
  }

  function renderCurrentViewCharts() {
    if (state.currentView === "dashboard") {
      const latestYear = getAvailableYears()[0];
      const records = state.data.revenues
        .filter((r) => Number(r.year) === latestYear)
        .sort((a, b) => a.month - b.month);
      window.CompanyCharts.renderRevenueChart(
        el("dashboardRevenueCanvas"),
        el("dashboardChartTooltip"),
        records
      );
    } else if (state.currentView === "revenue") {
      renderRevenueCharts();
    }
  }

  function renderAll() {
    renderDashboard();
    renderEmployees();
    renderCustomers();
    renderRevenueView();
  }

  // ---- 事件綁定 ----
  function bindEvents() {
    // 導覽切換
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });
    el("goRevenueBtn").addEventListener("click", () => switchView("revenue"));
    el("menuToggle").addEventListener("click", openMobileMenu);
    el("sidebarBackdrop").addEventListener("click", closeMobileMenu);

    // 關閉彈窗按鈕與背景點擊
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.remove("open");
        }
      });
    });

    // 確認對話框按鈕
    el("confirmActionBtn").addEventListener("click", () => {
      const fn = state.pendingConfirm;
      state.pendingConfirm = null;
      closeModal("confirmModal");
      if (typeof fn === "function") fn();
    });

    // 重設範例資料
    el("resetDataBtn").addEventListener("click", () => {
      openConfirm(
        "重設範例資料",
        "確定要清除目前變更，並恢復系統預設的繁體中文範例資料嗎？",
        () => {
          state.data = window.CompanyStore.reset();
          state.selectedYear = null;
          renderAll();
          showToast("已恢復預設範例資料");
        }
      );
    });

    // 編輯公司資訊
    el("editCompanyBtn").addEventListener("click", () => {
      const c = state.data.company;
      el("companyNameInput").value = c.name || "";
      el("companySloganInput").value = c.slogan || "";
      el("companyTaxIdInput").value = c.taxId || "";
      el("companyPhoneInput").value = c.phone || "";
      el("companyEmailInput").value = c.email || "";
      openModal("companyModal");
    });

    el("companyForm").addEventListener("submit", (e) => {
      e.preventDefault();
      state.data.company = {
        name: el("companyNameInput").value.trim(),
        slogan: el("companySloganInput").value.trim(),
        taxId: el("companyTaxIdInput").value.trim(),
        phone: el("companyPhoneInput").value.trim(),
        email: el("companyEmailInput").value.trim()
      };
      saveState();
      renderCompanyInfo();
      closeModal("companyModal");
      showToast("公司基本資訊已更新");
    });

    // 員工搜尋與篩選
    el("employeeSearch").addEventListener("input", renderEmployees);
    el("employeeDeptFilter").addEventListener("change", renderEmployees);
    el("employeeStatusFilter").addEventListener("change", renderEmployees);

    // 新增員工
    el("addEmployeeBtn").addEventListener("click", () => {
      el("employeeModalTitle").textContent = "新增員工";
      el("employeeIdInput").value = "";
      el("employeeForm").reset();
      el("employeeHireDateInput").value = new Date().toISOString().slice(0, 10);
      openModal("employeeModal");
    });

    // 員工表格操作
    el("employeeTableBody").addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit-emp]");
      if (editBtn) {
        const emp = state.data.employees.find((item) => item.id === editBtn.dataset.editEmp);
        if (!emp) return;
        el("employeeModalTitle").textContent = "編輯員工資料";
        el("employeeIdInput").value = emp.id;
        el("employeeNameInput").value = emp.name;
        el("employeeDeptInput").value = emp.department;
        el("employeeRoleInput").value = emp.role;
        el("employeeStatusInput").value = emp.status;
        el("employeePhoneInput").value = emp.phone || "";
        el("employeeHireDateInput").value = emp.hireDate;
        el("employeeEmailInput").value = emp.email;
        openModal("employeeModal");
        return;
      }

      const delBtn = e.target.closest("[data-del-emp]");
      if (delBtn) {
        const emp = state.data.employees.find((item) => item.id === delBtn.dataset.delEmp);
        if (!emp) return;
        openConfirm("刪除員工資料", "確定要刪除員工「" + emp.name + "」的資料嗎？", () => {
          state.data.employees = state.data.employees.filter((item) => item.id !== emp.id);
          saveState();
          renderAll();
          showToast("已刪除員工資料");
        });
      }
    });

    el("employeeForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = el("employeeIdInput").value;
      const payload = {
        id: id || window.CompanyStore.createId("emp"),
        name: el("employeeNameInput").value.trim(),
        department: el("employeeDeptInput").value.trim(),
        role: el("employeeRoleInput").value.trim(),
        status: el("employeeStatusInput").value,
        phone: el("employeePhoneInput").value.trim(),
        hireDate: el("employeeHireDateInput").value,
        email: el("employeeEmailInput").value.trim()
      };

      if (id) {
        const idx = state.data.employees.findIndex((item) => item.id === id);
        if (idx !== -1) state.data.employees[idx] = payload;
        showToast("已更新員工資料");
      } else {
        state.data.employees.push(payload);
        showToast("已新增員工：" + payload.name);
      }

      saveState();
      renderAll();
      closeModal("employeeModal");
    });

    // 客戶搜尋與篩選
    el("customerSearch").addEventListener("input", renderCustomers);
    el("customerIndustryFilter").addEventListener("change", renderCustomers);
    el("customerStatusFilter").addEventListener("change", renderCustomers);

    // 新增客戶
    el("addCustomerBtn").addEventListener("click", () => {
      el("customerModalTitle").textContent = "新增客戶";
      el("customerIdInput").value = "";
      el("customerForm").reset();
      el("customerValueInput").value = "0";
      openModal("customerModal");
    });

    // 客戶表格操作
    el("customerTableBody").addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit-cus]");
      if (editBtn) {
        const cus = state.data.customers.find((item) => item.id === editBtn.dataset.editCus);
        if (!cus) return;
        el("customerModalTitle").textContent = "編輯客戶資料";
        el("customerIdInput").value = cus.id;
        el("customerCompanyInput").value = cus.company;
        el("customerIndustryInput").value = cus.industry;
        el("customerContactInput").value = cus.contact;
        el("customerStatusInput").value = cus.status;
        el("customerPhoneInput").value = cus.phone || "";
        el("customerValueInput").value = String(cus.value || 0);
        el("customerEmailInput").value = cus.email;
        openModal("customerModal");
        return;
      }

      const delBtn = e.target.closest("[data-del-cus]");
      if (delBtn) {
        const cus = state.data.customers.find((item) => item.id === delBtn.dataset.delCus);
        if (!cus) return;
        openConfirm("刪除客戶資料", "確定要刪除客戶「" + cus.company + "」嗎？", () => {
          state.data.customers = state.data.customers.filter((item) => item.id !== cus.id);
          saveState();
          renderAll();
          showToast("已刪除客戶資料");
        });
      }
    });

    el("customerForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = el("customerIdInput").value;
      const payload = {
        id: id || window.CompanyStore.createId("cus"),
        company: el("customerCompanyInput").value.trim(),
        industry: el("customerIndustryInput").value.trim(),
        contact: el("customerContactInput").value.trim(),
        status: el("customerStatusInput").value,
        phone: el("customerPhoneInput").value.trim(),
        value: Number(el("customerValueInput").value) || 0,
        email: el("customerEmailInput").value.trim()
      };

      if (id) {
        const idx = state.data.customers.findIndex((item) => item.id === id);
        if (idx !== -1) state.data.customers[idx] = payload;
        showToast("已更新客戶資料");
      } else {
        state.data.customers.push(payload);
        showToast("已新增客戶：" + payload.company);
      }

      saveState();
      renderAll();
      closeModal("customerModal");
    });

    // 營業額統計操作
    el("revenueYearSelect").addEventListener("change", () => {
      state.selectedYear = Number(el("revenueYearSelect").value);
      renderRevenueView();
    });

    el("addRevenueBtn").addEventListener("click", () => {
      ensureSelectedYear();
      el("revenueModalTitle").textContent = "新增月度營業額";
      el("revenueIdInput").value = "";
      el("revenueForm").reset();
      el("revenueYearInput").value = String(state.selectedYear);

      const usedMonths = new Set(
        state.data.revenues
          .filter((r) => Number(r.year) === state.selectedYear)
          .map((r) => Number(r.month))
      );
      let nextMonth = 12;
      for (let m = 1; m <= 12; m++) {
        if (!usedMonths.has(m)) {
          nextMonth = m;
          break;
        }
      }
      el("revenueMonthInput").value = String(nextMonth);
      openModal("revenueModal");
    });

    el("revenueTableBody").addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit-rev]");
      if (editBtn) {
        const rec = state.data.revenues.find((item) => item.id === editBtn.dataset.editRev);
        if (!rec) return;
        el("revenueModalTitle").textContent = "編輯月度營業額";
        el("revenueIdInput").value = rec.id;
        el("revenueYearInput").value = String(rec.year);
        el("revenueMonthInput").value = String(rec.month);
        el("revenueActualInput").value = String(rec.actual);
        el("revenueTargetInput").value = String(rec.target);
        el("revenueNoteInput").value = rec.note || "";
        openModal("revenueModal");
        return;
      }

      const delBtn = e.target.closest("[data-del-rev]");
      if (delBtn) {
        const rec = state.data.revenues.find((item) => item.id === delBtn.dataset.delRev);
        if (!rec) return;
        openConfirm(
          "刪除營業額紀錄",
          "確定要刪除 " + rec.year + " 年 " + rec.month + " 月的營業額紀錄嗎？",
          () => {
            state.data.revenues = state.data.revenues.filter((item) => item.id !== rec.id);
            saveState();
            renderAll();
            showToast("已刪除營業額紀錄");
          }
        );
      }
    });

    el("revenueForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = el("revenueIdInput").value;
      const year = Number(el("revenueYearInput").value);
      const month = Number(el("revenueMonthInput").value);
      const actual = Number(el("revenueActualInput").value) || 0;
      const target = Number(el("revenueTargetInput").value) || 0;
      const note = el("revenueNoteInput").value.trim();

      const existingIdx = state.data.revenues.findIndex(
        (r) => Number(r.year) === year && Number(r.month) === month && r.id !== id
      );

      if (id) {
        const idx = state.data.revenues.findIndex((r) => r.id === id);
        if (idx !== -1) {
          state.data.revenues[idx] = { id, year, month, actual, target, note };
        }
        if (existingIdx !== -1) {
          state.data.revenues.splice(existingIdx, 1);
        }
        showToast("已更新 " + year + " 年 " + month + " 月營業額");
      } else if (existingIdx !== -1) {
        const existingId = state.data.revenues[existingIdx].id;
        state.data.revenues[existingIdx] = { id: existingId, year, month, actual, target, note };
        showToast("已更新既有 " + year + " 年 " + month + " 月營業額");
      } else {
        state.data.revenues.push({
          id: window.CompanyStore.createId("rev"),
          year,
          month,
          actual,
          target,
          note
        });
        showToast("已新增 " + year + " 年 " + month + " 月營業額");
      }

      state.selectedYear = year;
      saveState();
      renderAll();
      closeModal("revenueModal");
    });

    // 視窗縮放時重新繪製圖表
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderCurrentViewCharts, 120);
    });
  }

  function init() {
    const now = new Date();
    el("todayBadge").textContent =
      now.getFullYear() + " 年 " + (now.getMonth() + 1) + " 月 " + now.getDate() + " 日";

    bindEvents();
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
