import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const supabaseUrl = "https://cajlcifpnsacdmcofgem.supabase.co";
const supabaseKey = "sb_publishable_fo8lRlMt0QI0Q4FJkRhYJg_ITkxGUJk";
const supabase = createClient(supabaseUrl, supabaseKey);

const SHEET_ID = "1GwTd-C6ryVqNtYZvLaZygCe3Sv8SyumRKba4c7kBCcM";
const SHEET_NAME = "Лист1";

const months = [
  ["03", "Март"],
  ["04", "Апрель"],
  ["05", "Май"],
  ["06", "Июнь"],
  ["07", "Июль"],
  ["08", "Август"],
  ["09", "Сентябрь"],
  ["10", "Октябрь"],
  ["11", "Ноябрь"],
  ["12", "Декабрь"],
];

const manualTeams = ["Родина", "Академия Родина", "Академия Динамовец"];

const googleBlocks = [
  { team: "Родина-2", dateCol: 1, opponentCol: 2 },
  { team: "Родина-3", dateCol: 3, opponentCol: 4 },
  { team: "Родина (МФЛ)", dateCol: 5, opponentCol: 6 },
  { team: "Родина (ЮФЛ)", dateCol: 7, opponentCol: 8 },
];

const allTeams = [
  "Родина",
  "Родина-2",
  "Родина-3",
  "Родина (МФЛ)",
  "Родина (ЮФЛ)",
  "Академия Родина",
  "Академия Динамовец",
];

function money(n) {
  return Number(n || 0).toLocaleString("ru-RU") + " ₽";
}

function intValue(v) {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function monthName(num) {
  return months.find((m) => m[0] === num)?.[1] || num;
}

function normalizeDate(raw) {
  const text = String(raw || "").trim().toLowerCase().replace(/ё/g, "е");
  if (!text) return "";

  let m = text.match(/(\d{1,2})[.\-/](\d{1,2})/);
  if (m) return `${m[1].padStart(2, "0")}.${m[2].padStart(2, "0")}`;

  const monthMap = {
    марта: "03",
    март: "03",
    апреля: "04",
    апрель: "04",
    мая: "05",
    май: "05",
    июня: "06",
    июнь: "06",
    июля: "07",
    июль: "07",
    августа: "08",
    август: "08",
    сентября: "09",
    сентябрь: "09",
    октября: "10",
    октябрь: "10",
    ноября: "11",
    ноябрь: "11",
    декабря: "12",
    декабрь: "12",
  };

  m = text.match(/(\d{1,2})\s+([а-я]+)/i);
  if (m && monthMap[m[2]]) return `${m[1].padStart(2, "0")}.${monthMap[m[2]]}`;

  return "";
}

function isHomeOpponent(s) {
  return /\(д\)/i.test(String(s || ""));
}

function cleanOpponent(s) {
  return String(s || "")
    .replace(/\(д\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function loadGoogleSheetJsonp() {
  return new Promise((resolve, reject) => {
    const callbackName = "googleSheetCallback_" + Date.now();

    const cleanup = () => {
      delete window[callbackName];
      document.getElementById(callbackName)?.remove();
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("таймаут загрузки Google-таблицы"));
    }, 12000);

    window[callbackName] = (data) => {
      clearTimeout(timer);
      cleanup();

      const rows =
        data?.table?.rows?.map((row) =>
          (row.c || []).map((cell) => {
            if (!cell) return "";
            return cell.f ?? cell.v ?? "";
          })
        ) || [];

      resolve(rows);
    };

    const script = document.createElement("script");
    script.id = callbackName;
    script.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error("Google Sheets не ответил"));
    };
    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
      SHEET_NAME
    )}&tqx=responseHandler:${callbackName}&cacheBust=${Date.now()}`;
    document.body.appendChild(script);
  });
}

export default function App() {
  const [page, setPage] = useState("calc");
  const [month, setMonth] = useState("03");
  const [googleMatches, setGoogleMatches] = useState([]);
  const [manualMatches, setManualMatches] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [selected, setSelected] = useState({});
  const [status, setStatus] = useState("Загрузка...");
  const [error, setError] = useState("");

  const [formTeam, setFormTeam] = useState("Родина");
  const [formMonth, setFormMonth] = useState("03");
  const [formDay, setFormDay] = useState("");
  const [formOpponent, setFormOpponent] = useState("");
  const [formType, setFormType] = useState("дом");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadTariffs(), loadManualMatches(), loadGoogleMatches()]);
  }

  async function loadTariffs() {
    const { data, error } = await supabase.from("tariffs").select("*");
    if (error) {
      setError("Ошибка загрузки тарифов: " + error.message);
      return;
    }
    setTariffs(data || []);
  }

  async function loadManualMatches() {
    const { data, error } = await supabase
      .from("manual_matches")
      .select("*")
      .order("month")
      .order("day");

    if (error) {
      setError("Ошибка загрузки ручных матчей: " + error.message);
      return;
    }

    setManualMatches(data || []);
  }

  async function loadGoogleMatches() {
    setStatus("Google-таблица: загрузка...");
    setError("");

    try {
      const rows = await loadGoogleSheetJsonp();
      const matches = [];

      for (const block of googleBlocks) {
        for (let i = 0; i < rows.length; i++) {
          const date = normalizeDate(rows[i]?.[block.dateCol]);
          const rawOpponent = rows[i]?.[block.opponentCol] || "";

          if (!date || !rawOpponent.trim()) continue;
          if (isHomeOpponent(rawOpponent)) continue;

          matches.push({
            id: `g-${block.team}-${date}-${cleanOpponent(rawOpponent)}-${i}`,
            source: "google",
            team: block.team,
            date,
            opponent: cleanOpponent(rawOpponent),
            match_type: "выезд",
          });
        }
      }

      setGoogleMatches(matches);
      setStatus(`Google-таблица: загружено гостевых матчей ${matches.length}`);
    } catch (e) {
      setStatus("Google-таблица: ошибка");
      setError("Не удалось загрузить Google-таблицу: " + e.message);
    }
  }

  const currentMatches = useMemo(() => {
    const google = googleMatches.filter((m) => m.date.slice(3, 5) === month);

    const manual = manualMatches
      .filter((m) => String(m.month).padStart(2, "0") === month)
      .map((m) => ({
        id: m.id,
        source: "manual",
        team: m.team,
        date: `${String(m.day).padStart(2, "0")}.${String(m.month).padStart(2, "0")}`,
        opponent: m.opponent,
        match_type: m.match_type,
      }));

    return [...google, ...manual].sort((a, b) => {
      const da = Number(a.date.slice(0, 2));
      const db = Number(b.date.slice(0, 2));
      if (da !== db) return da - db;
      return a.team.localeCompare(b.team, "ru");
    });
  }, [googleMatches, manualMatches, month]);

  function tariffFor(team, type) {
    const row = tariffs.find((t) => t.team === team && t.match_type === type);
    return row || { team, match_type: type, taxi_amount: 0, pizza_amount: 0 };
  }

  function toggle(matchId, service) {
    setSelected((prev) => ({
      ...prev,
      [matchId]: {
        taxi: service === "taxi" ? !prev[matchId]?.taxi : !!prev[matchId]?.taxi,
        pizza: service === "pizza" ? !prev[matchId]?.pizza : !!prev[matchId]?.pizza,
      },
    }));
  }

  function getRows(onlySelected) {
    return currentMatches
      .map((m) => {
        const s = selected[m.id] || {};
        const type = manualTeams.includes(m.team) ? m.match_type : "выезд";
        const t = tariffFor(m.team, type);

        const taxi = s.taxi ? intValue(t.taxi_amount) : 0;
        const pizza = s.pizza ? intValue(t.pizza_amount) : 0;

        return {
          team: m.team,
          opponent: m.opponent,
          date: m.date,
          type: manualTeams.includes(m.team) ? m.match_type : "",
          taxi,
          pizza,
          total: taxi + pizza,
          selected: !!s.taxi || !!s.pizza,
        };
      })
      .filter((r) => (onlySelected ? r.selected : true));
  }

  const selectedRows = getRows(true);
  const allPdfRows = getRows(false);
  const total = selectedRows.reduce((s, r) => s + r.total, 0);

  async function addManualMatch() {
    setError("");

    const day = intValue(formDay);
    if (!day || day < 1 || day > 31) {
      setError("Укажи день от 1 до 31.");
      return;
    }
    if (!formOpponent.trim()) {
      setError("Укажи соперника.");
      return;
    }

    const { error } = await supabase.from("manual_matches").insert({
      team: formTeam,
      month: Number(formMonth),
      day,
      opponent: formOpponent.trim(),
      match_type: formType,
    });

    if (error) {
      setError("Ошибка добавления матча: " + error.message);
      return;
    }

    setFormDay("");
    setFormOpponent("");
    await loadManualMatches();
  }

  async function deleteManualMatch(id) {
    const { error } = await supabase.from("manual_matches").delete().eq("id", id);
    if (error) {
      setError("Ошибка удаления матча: " + error.message);
      return;
    }
    await loadManualMatches();
  }

  function updateTariffLocal(team, type, field, value) {
    setTariffs((prev) => {
      const exists = prev.find((t) => t.team === team && t.match_type === type);
      if (exists) {
        return prev.map((t) =>
          t.team === team && t.match_type === type ? { ...t, [field]: intValue(value) } : t
        );
      }
      return [
        ...prev,
        {
          team,
          match_type: type,
          taxi_amount: field === "taxi_amount" ? intValue(value) : 0,
          pizza_amount: field === "pizza_amount" ? intValue(value) : 0,
        },
      ];
    });
  }

  async function saveTariffs() {
    const payload = [];

    for (const team of allTeams) {
      if (manualTeams.includes(team)) {
        payload.push(tariffFor(team, "дом"));
        payload.push(tariffFor(team, "выезд"));
      } else {
        payload.push(tariffFor(team, "выезд"));
      }
    }

    const { error } = await supabase.from("tariffs").upsert(payload, {
      onConflict: "team,match_type",
    });

    if (error) {
      setError("Ошибка сохранения тарифов: " + error.message);
      return;
    }

    alert("Тарифы сохранены");
    await loadTariffs();
  }

  function printPdf() {
    const rows = allPdfRows;
    const pdfTotal = rows.reduce((s, r) => s + r.total, 0);

    const html = `
      <html>
        <head>
          <title>Аванс_${monthName(month)}_2026</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #999; padding: 6px; text-align: left; }
            th { background: #eee; }
            .right { text-align: right; }
            .total td { font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Команда</th>
                <th>Соперник</th>
                <th>Дата</th>
                <th>Тип</th>
                <th>Такси</th>
                <th>Пицца</th>
                <th>Итого</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) => `
                <tr>
                  <td>${r.team}</td>
                  <td>${r.opponent}</td>
                  <td>${r.date}</td>
                  <td>${r.type}</td>
                  <td class="right">${r.taxi || 0}</td>
                  <td class="right">${r.pizza || 0}</td>
                  <td class="right">${r.total || 0}</td>
                </tr>`
                )
                .join("")}
              <tr class="total">
                <td colspan="6" class="right">ИТОГО</td>
                <td class="right">${pdfTotal}</td>
              </tr>
            </tbody>
          </table>
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>Расчёт аванса</h1>
          <p>Такси и пицца по матчам команд</p>
        </div>
        <div className="status">{status}</div>
      </header>

      <nav>
        <button className={page === "calc" ? "active" : ""} onClick={() => setPage("calc")}>
          Расчёт аванса
        </button>
        <button className={page === "manual" ? "active" : ""} onClick={() => setPage("manual")}>
          Ручные матчи
        </button>
        <button className={page === "tariffs" ? "active" : ""} onClick={() => setPage("tariffs")}>
          Тарифы
        </button>
      </nav>

      {error && <div className="error">{error}</div>}

      {page === "calc" && (
        <>
          <section className="card">
            <h2>Месяц</h2>
            <div className="buttons">
              {months.map(([num, name]) => (
                <button
                  key={num}
                  className={month === num ? "active" : ""}
                  onClick={() => {
                    setMonth(num);
                    setSelected({});
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <button className="secondary" onClick={loadGoogleMatches}>
              Обновить Google-таблицу
            </button>
          </section>

          <section className="card">
            <h2>Матчи месяца</h2>
            <div className="matches">
              {currentMatches.length === 0 && <div className="empty">Матчей нет</div>}

              {currentMatches.map((m) => {
                const s = selected[m.id] || {};
                return (
                  <div className="match" key={m.id}>
                    <div>
                      <b>{m.team}</b>
                      <span>
                        {m.date}
                        {manualTeams.includes(m.team) ? ` · ${m.match_type}` : ""}
                      </span>
                    </div>
                    <div>{m.opponent}</div>
                    <button className={s.taxi ? "service on" : "service"} onClick={() => toggle(m.id, "taxi")}>
                      Такси
                    </button>
                    <button className={s.pizza ? "service on" : "service"} onClick={() => toggle(m.id, "pizza")}>
                      Пицца
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <h2>Итоговая таблица</h2>
            <Table rows={selectedRows} />
            <div className="total">ИТОГО: {money(total)}</div>
            <button className="primary" onClick={printPdf}>
              PDF / печать
            </button>
          </section>
        </>
      )}

      {page === "manual" && (
        <section className="card">
          <h2>Ручные матчи</h2>

          <label>Команда</label>
          <div className="buttons">
            {manualTeams.map((t) => (
              <button key={t} className={formTeam === t ? "active" : ""} onClick={() => setFormTeam(t)}>
                {t}
              </button>
            ))}
          </div>

          <label>Месяц</label>
          <div className="buttons">
            {months.map(([num, name]) => (
              <button key={num} className={formMonth === num ? "active" : ""} onClick={() => setFormMonth(num)}>
                {name}
              </button>
            ))}
          </div>

          <label>День</label>
          <input value={formDay} onChange={(e) => setFormDay(e.target.value)} placeholder="12" />

          <label>Соперник</label>
          <input value={formOpponent} onChange={(e) => setFormOpponent(e.target.value)} placeholder="Спартак" />

          <label>Тип матча</label>
          <div className="buttons">
            <button className={formType === "дом" ? "active" : ""} onClick={() => setFormType("дом")}>
              Дом
            </button>
            <button className={formType === "выезд" ? "active" : ""} onClick={() => setFormType("выезд")}>
              Выезд
            </button>
          </div>

          <button className="primary" onClick={addManualMatch}>
            Добавить матч
          </button>

          <h3>Добавленные матчи</h3>
          <table>
            <thead>
              <tr>
                <th>Команда</th>
                <th>Дата</th>
                <th>Соперник</th>
                <th>Тип</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {manualMatches.map((m) => (
                <tr key={m.id}>
                  <td>{m.team}</td>
                  <td>
                    {String(m.day).padStart(2, "0")}.{String(m.month).padStart(2, "0")}
                  </td>
                  <td>{m.opponent}</td>
                  <td>{m.match_type}</td>
                  <td>
                    <button className="danger" onClick={() => deleteManualMatch(m.id)}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {page === "tariffs" && (
        <section className="card">
          <h2>Тарифы</h2>

          {allTeams.map((team) => (
            <div className="tariff" key={team}>
              <b>{team}</b>

              {manualTeams.includes(team) ? (
                <>
                  <TariffInput
                    label="Дом · такси"
                    value={tariffFor(team, "дом").taxi_amount}
                    onChange={(v) => updateTariffLocal(team, "дом", "taxi_amount", v)}
                  />
                  <TariffInput
                    label="Дом · пицца"
                    value={tariffFor(team, "дом").pizza_amount}
                    onChange={(v) => updateTariffLocal(team, "дом", "pizza_amount", v)}
                  />
                  <TariffInput
                    label="Выезд · такси"
                    value={tariffFor(team, "выезд").taxi_amount}
                    onChange={(v) => updateTariffLocal(team, "выезд", "taxi_amount", v)}
                  />
                  <TariffInput
                    label="Выезд · пицца"
                    value={tariffFor(team, "выезд").pizza_amount}
                    onChange={(v) => updateTariffLocal(team, "выезд", "pizza_amount", v)}
                  />
                </>
              ) : (
                <>
                  <TariffInput
                    label="Такси"
                    value={tariffFor(team, "выезд").taxi_amount}
                    onChange={(v) => updateTariffLocal(team, "выезд", "taxi_amount", v)}
                  />
                  <TariffInput
                    label="Пицца"
                    value={tariffFor(team, "выезд").pizza_amount}
                    onChange={(v) => updateTariffLocal(team, "выезд", "pizza_amount", v)}
                  />
                </>
              )}
            </div>
          ))}

          <button className="primary" onClick={saveTariffs}>
            Сохранить тарифы
          </button>
        </section>
      )}
    </div>
  );
}

function TariffInput({ label, value, onChange }) {
  return (
    <div>
      <label>{label}, ₽</label>
      <input type="number" min="0" value={value || 0} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Table({ rows }) {
  if (!rows.length) return <div className="empty">Пока не выбрано такси или пицца</div>;

  return (
    <table>
      <thead>
        <tr>
          <th>Команда</th>
          <th>Соперник</th>
          <th>Дата</th>
          <th>Тип</th>
          <th>Такси</th>
          <th>Пицца</th>
          <th>Итого</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td>{r.team}</td>
            <td>{r.opponent}</td>
            <td>{r.date}</td>
            <td>{r.type}</td>
            <td>{money(r.taxi)}</td>
            <td>{money(r.pizza)}</td>
            <td>
              <b>{money(r.total)}</b>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
