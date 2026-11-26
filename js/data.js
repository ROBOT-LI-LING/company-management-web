(function (global) {
  "use strict";

  const STORAGE_KEY = "company_mgmt_data_v1";

  const DEFAULT_DATA = {
    company: {
      name: "星辰創新科技有限公司",
      slogan: "以智慧數位方案，陪伴企業穩健成長",
      taxId: "54829103",
      phone: "02-2758-6600",
      email: "contact@starlight-tech.tw"
    },
    employees: [
      {
        id: "emp-1",
        name: "林志遠",
        department: "研發部",
        role: "資深後端工程師",
        phone: "0912-345-678",
        email: "cy.lin@starlight-tech.tw",
        hireDate: "2022-03-15",
        status: "在職"
      },
      {
        id: "emp-2",
        name: "陳雅婷",
        department: "業務部",
        role: "企業客戶經理",
        phone: "0928-654-321",
        email: "yt.chen@starlight-tech.tw",
        hireDate: "2021-08-01",
        status: "在職"
      },
      {
        id: "emp-3",
        name: "張家豪",
        department: "設計部",
        role: "UI/UX 產品設計師",
        phone: "0933-778-899",
        email: "jh.chang@starlight-tech.tw",
        hireDate: "2023-05-10",
        status: "在職"
      },
      {
        id: "emp-4",
        name: "王美玲",
        department: "人資部",
        role: "人資暨行政主任",
        phone: "0955-112-233",
        email: "ml.wang@starlight-tech.tw",
        hireDate: "2020-11-20",
        status: "在職"
      },
      {
        id: "emp-5",
        name: "李宗翰",
        department: "研發部",
        role: "前端工程師",
        phone: "0966-445-566",
        email: "th.lee@starlight-tech.tw",
        hireDate: "2024-02-01",
        status: "留職停薪"
      },
      {
        id: "emp-6",
        name: "黃詩涵",
        department: "財務部",
        role: "財務分析師",
        phone: "0972-889-900",
        email: "sh.huang@starlight-tech.tw",
        hireDate: "2023-09-04",
        status: "在職"
      }
    ],
    customers: [
      {
        id: "cus-1",
        company: "豐華智慧零售股份有限公司",
        contact: "周柏宏",
        industry: "零售業",
        phone: "02-2345-8800",
        email: "bh.chou@fenghua-retail.tw",
        value: 2850000,
        status: "合作中"
      },
      {
        id: "cus-2",
        company: "宏達精密工業有限公司",
        contact: "吳佩珊",
        industry: "製造業",
        phone: "04-2233-7711",
        email: "ps.wu@hongda-ind.tw",
        value: 3400000,
        status: "合作中"
      },
      {
        id: "cus-3",
        company: "遠景雲端金融科技",
        contact: "蔡明哲",
        industry: "金融業",
        phone: "02-8780-5500",
        email: "mj.tsai@visionfin.tw",
        value: 4120000,
        status: "合作中"
      },
      {
        id: "cus-4",
        company: "康健生醫數據中心",
        contact: "許淑芬",
        industry: "醫療生技",
        phone: "03-5520-1234",
        email: "sf.hsu@healthbio.tw",
        value: 1680000,
        status: "洽談中"
      },
      {
        id: "cus-5",
        company: "捷迅物流科技股份有限公司",
        contact: "劉建志",
        industry: "物流運輸",
        phone: "03-3318-9900",
        email: "jj.liu@swiftlogi.tw",
        value: 2150000,
        status: "合作中"
      },
      {
        id: "cus-6",
        company: "光耀半導體設備廠",
        contact: "鄭文傑",
        industry: "科技業",
        phone: "03-577-4422",
        email: "wj.cheng@brightsemi.tw",
        value: 1920000,
        status: "已結案"
      }
    ],
    revenues: [
      // 2025 年完整資料
      { id: "rev-2025-1", year: 2025, month: 1, actual: 1120000, target: 1100000, note: "年初續約專案入帳" },
      { id: "rev-2025-2", year: 2025, month: 2, actual: 980000, target: 1050000, note: "春節工作天數較少" },
      { id: "rev-2025-3", year: 2025, month: 3, actual: 1340000, target: 1200000, note: "製造業 ERP 導入驗收" },
      { id: "rev-2025-4", year: 2025, month: 4, actual: 1280000, target: 1250000, note: "穩定維運服務營收" },
      { id: "rev-2025-5", year: 2025, month: 5, actual: 1410000, target: 1300000, note: "零售客戶新系統上線" },
      { id: "rev-2025-6", year: 2025, month: 6, actual: 1560000, target: 1400000, note: "年中大型標案結案" },
      { id: "rev-2025-7", year: 2025, month: 7, actual: 1480000, target: 1450000, note: "雲端架構顧問專案" },
      { id: "rev-2025-8", year: 2025, month: 8, actual: 1520000, target: 1450000, note: "金融業資安升級" },
      { id: "rev-2025-9", year: 2025, month: 9, actual: 1650000, target: 1500000, note: "第三季衝刺達標" },
      { id: "rev-2025-10", year: 2025, month: 10, actual: 1590000, target: 1550000, note: "物流追蹤系統二期" },
      { id: "rev-2025-11", year: 2025, month: 11, actual: 1730000, target: 1600000, note: "雙十一零售支援加值" },
      { id: "rev-2025-12", year: 2025, month: 12, actual: 1920000, target: 1750000, note: "年度專案集中驗收" },

      // 2026 年資料
      { id: "rev-2026-1", year: 2026, month: 1, actual: 1450000, target: 1400000, note: "年度維護合約續簽" },
      { id: "rev-2026-2", year: 2026, month: 2, actual: 1320000, target: 1350000, note: "春節假期調整" },
      { id: "rev-2026-3", year: 2026, month: 3, actual: 1680000, target: 1550000, note: "智慧倉儲平台交付" },
      { id: "rev-2026-4", year: 2026, month: 4, actual: 1740000, target: 1600000, note: "新簽兩家企業客戶" },
      { id: "rev-2026-5", year: 2026, month: 5, actual: 1620000, target: 1650000, note: "部分專案延至下月驗收" },
      { id: "rev-2026-6", year: 2026, month: 6, actual: 1950000, target: 1750000, note: "上半年大型專案入帳" },
      { id: "rev-2026-7", year: 2026, month: 7, actual: 1840000, target: 1800000, note: "AI 客服模組上線" },
      { id: "rev-2026-8", year: 2026, month: 8, actual: 2010000, target: 1850000, note: "金融數據儀表板驗收" },
      { id: "rev-2026-9", year: 2026, month: 9, actual: 2140000, target: 1950000, note: "第三季表現亮眼" },
      { id: "rev-2026-10", year: 2026, month: 10, actual: 2080000, target: 2000000, note: "持續擴展中南部客戶" },
      { id: "rev-2026-11", year: 2026, month: 11, actual: 2290000, target: 2100000, note: "年底專案第一階段驗收" }
    ]
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = clone(DEFAULT_DATA);
        save(fresh);
        return fresh;
      }
      const parsed = JSON.parse(raw);
      return {
        company: Object.assign({}, DEFAULT_DATA.company, parsed.company || {}),
        employees: Array.isArray(parsed.employees) ? parsed.employees : clone(DEFAULT_DATA.employees),
        customers: Array.isArray(parsed.customers) ? parsed.customers : clone(DEFAULT_DATA.customers),
        revenues: Array.isArray(parsed.revenues) ? parsed.revenues : clone(DEFAULT_DATA.revenues)
      };
    } catch (err) {
      console.warn("讀取本機資料失敗，將使用預設資料：", err);
      return clone(DEFAULT_DATA);
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("儲存本機資料失敗：", err);
    }
  }

  function reset() {
    const fresh = clone(DEFAULT_DATA);
    save(fresh);
    return fresh;
  }

  function createId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  global.CompanyStore = {
    load,
    save,
    reset,
    createId
  };
})(window);
