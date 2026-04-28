import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { toPng } from "html-to-image";
import "./style.css";

const supabaseUrl = "https://cajlcifpnsacdmcofgem.supabase.co";
const supabaseKey = "sb_publishable_fo8lRlMt0QI0Q4FJkRhYJg_ITkxGUJk";
const supabase = createClient(supabaseUrl, supabaseKey);

const SHEET_ID = "1GwTd-C6ryVqNtYZvLaZygCe3Sv8SyumRKba4c7kBCcM";
const SHEET_NAME = "Лист1";
const GOOGLE_CACHE_KEY = "rodina_google_matches_cache_v1";

const advanceMonths = [
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

const yearMonths = [
  ["01", "Январь"],
  ["02", "Февраль"],
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

const dynamovetsYears = [2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];

const fieldTrainingPlaces = ["Поле №1", "Поле №2", "Поле №3"];
const trainingPlaces = ["Поле №1", "Поле №2", "Поле №3", "Зал"];
const homeMatchPlaces = ["Родина №1", "Родина №2"];

const timeOptions = Array.from({ length: 49 }, (_, index) => {
  const totalMinutes = 9 * 60 + index * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

function money(n) {
  return Number(n || 0).toLocaleString("ru-RU") + " ₽";
}

function intValue(v) {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIsoDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, count) {
  const d = new Date(date);
  d.setDate(d.getDate() + count);
  return d;
}

function formatRuDate(iso) {
  const d = fromIsoDate(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

function monthName(num, list = yearMonths) {
  return list.find((m) => m[0] === num)?.[1] || num;
}

function timeToMinutes(time) {
  const match = String(time || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function normalizeDate(raw) {
  const text = String(raw || "").trim().toLowerCase().replace(/ё/g, "е");
  if (!text) return "";

  let m = text.match(/(\d{1,2})[.\-/](\d{1,2})/);
  if (m) return `${m[1].padStart(2, "0")}.${m[2].padStart(2, "0")}`;

  const monthMap = {
    января: "01",
    январь: "01",
    февраля: "02",
    февраль: "02",
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

function parseGoogleRowsToMatches(rows) {
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

  return matches;
}

function readGoogleCache() {
  try {
    const raw = localStorage.getItem(GOOGLE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.matches)) return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveGoogleCache(matches) {
  localStorage.setItem(
    GOOGLE_CACHE_KEY,
    JSON.stringify({
      saved_at: new Date().toISOString(),
      matches,
    })
  );
}

function getWeeksForMonth2026(monthNum) {
  const year = 2026;
  const monthIndex = Number(monthNum) - 1;

  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);

  const start = new Date(first);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - (day - 1));

  const weeks = [];
  let cur = new Date(start);

  while (cur <= last || cur.getMonth() === monthIndex) {
    const weekStart = new Date(cur);
    const weekEnd = addDays(weekStart, 6);

    const intersects =
      (weekStart <= last && weekEnd >= first) ||
      weekStart.getMonth() === monthIndex ||
      weekEnd.getMonth() === monthIndex;

    if (intersects) {
      weeks.push({
        startIso: toIsoDate(weekStart),
        endIso: toIsoDate(weekEnd),
        label: `${formatRuDate(toIsoDate(weekStart))}–${formatRuDate(toIsoDate(weekEnd))}`,
        days: Array.from({ length: 7 }, (_, i) => {
          const d = addDays(weekStart, i);

          return {
            iso: toIsoDate(d),
            label: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i],
            date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`,
          };
        }),
      });
    }

    cur = addDays(cur, 7);
    if (weeks.length > 6) break;
  }

  return weeks;
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

  const [dynTab, setDynTab] = useState("schedule");
  const [dynMonth, setDynMonth] = useState("01");
  const [dynWeekStart, setDynWeekStart] = useState("");
  const [dynSelectedDate, setDynSelectedDate] = useState("");
  const [dynEvents, setDynEvents] = useState([]);
  const [dynTrainers, setDynTrainers] = useState([]);

  const [dynYear, setDynYear] = useState(2017);
  const [dynEventType, setDynEventType] = useState("training");
  const [editingEventId, setEditingEventId] = useState(null);

  const [trainingData, setTrainingData] = useState({});
  const [activeTimeTarget, setActiveTimeTarget] = useState(null);

  const [matchHomeAway, setMatchHomeAway] = useState("home");
  const [matchTime, setMatchTime] = useState("");
  const [matchTournament, setMatchTournament] = useState("");
  const [matchOpponent, setMatchOpponent] = useState("");
  const [matchPlace, setMatchPlace] = useState("Родина №1");

  const scheduleRef = useRef(null);

  const dynWeeks = useMemo(() => getWeeksForMonth2026(dynMonth), [dynMonth]);
  const selectedWeek = dynWeeks.find((w) => w.startIso === dynWeekStart) || dynWeeks[0];

  const trainingProblems = useMemo(() => {
    if (dynEventType !== "training") return [];
    return getTrainingProblems();
  }, [dynEventType, trainingData, dynEvents, dynSelectedDate, dynYear, editingEventId]);

  const pageTitle = page === "dynamovets" ? "Расписание Динамовец" : "Расчёт аванса";

  useEffect(() => {
    loadAll();
    loadDynamovetsData();
  }, []);

  useEffect(() => {
    if (!dynWeekStart && dynWeeks.length) {
      setDynWeekStart(dynWeeks[0].startIso);
      setDynSelectedDate(dynWeeks[0].days[0].iso);
    }
  }, [dynWeeks, dynWeekStart]);

  async function loadAll() {
    loadGoogleFromCache();
    await Promise.all([loadTariffs(), loadManualMatches()]);
  }

  function loadGoogleFromCache() {
    const cached = readGoogleCache();

    if (cached) {
      setGoogleMatches(cached.matches);
      const date = new Date(cached.saved_at);
      setStatus(`Google-таблица: данные из кэша, ${date.toLocaleString("ru-RU")}`);
    } else {
      setStatus("Google-таблица: кэша нет, нажми «Обновить Google-таблицу»");
    }
  }

  async function refreshGoogleMatches() {
    setStatus("Google-таблица: обновление...");
    setError("");

    try {
      const rows = await loadGoogleSheetJsonp();
      const matches = parseGoogleRowsToMatches(rows);

      setGoogleMatches(matches);
      saveGoogleCache(matches);

      setStatus(`Google-таблица: обновлено гостевых матчей ${matches.length}`);
    } catch (e) {
      const cached = readGoogleCache();

      if (cached) {
        setGoogleMatches(cached.matches);
        setStatus("Google-таблица: Google не ответил, оставлены данные из кэша");
        setError("Не удалось обновить Google-таблицу: " + e.message);
      } else {
        setStatus("Google-таблица: ошибка");
        setError("Не удалось загрузить Google-таблицу: " + e.message);
      }
    }
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

  async function loadDynamovetsData() {
    const trainersResult = await supabase
      .from("dynamovets_trainers")
      .select("*")
      .order("team_year", { ascending: false });

    if (trainersResult.error) {
      setError("Ошибка загрузки тренеров Динамовца: " + trainersResult.error.message);
    } else {
      setDynTrainers(trainersResult.data || []);
    }

    const eventsResult = await supabase
      .from("dynamovets_schedule_events")
      .select("*")
      .order("event_date")
      .order("team_year", { ascending: false });

    if (eventsResult.error) {
      setError("Ошибка загрузки расписания Динамовца: " + eventsResult.error.message);
    } else {
      setDynEvents(eventsResult.data || []);
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
          <title>Аванс_${monthName(month, advanceMonths)}_2026</title>
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
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }

  function trainerName(year) {
    return dynTrainers.find((t) => Number(t.team_year) === Number(year))?.trainer_name || "";
  }

  function eventFor(year, isoDate) {
    return dynEvents.find(
      (e) => Number(e.team_year) === Number(year) && e.event_date === isoDate
    );
  }

  function existingSelectedEvent() {
    return eventFor(dynYear, dynSelectedDate);
  }

  function getTrainingProblems() {
    const problems = [];
    const currentItems = Object.entries(trainingData).map(([place, data]) => ({
      place,
      start: data.start || "",
      end: data.end || "",
    }));

    for (const item of currentItems) {
      if (!item.start || !item.end) continue;

      const start = timeToMinutes(item.start);
      const end = timeToMinutes(item.end);

      if (start === null || end === null) continue;

      if (end <= start) {
        problems.push({
          type: "invalid_time",
          message: `${item.place}: окончание должно быть позже начала.`,
        });
        continue;
      }

      const sameDateEvents = dynEvents.filter((event) => {
        if (event.event_date !== dynSelectedDate) return false;
        if (event.event_type !== "training") return false;
        if (editingEventId && event.id === editingEventId) return false;
        return true;
      });

      for (const event of sameDateEvents) {
        for (const existingItem of event.training_items || []) {
          if (existingItem.place !== item.place) continue;

          const existingStart = timeToMinutes(existingItem.start);
          const existingEnd = timeToMinutes(existingItem.end);

          if (existingStart === null || existingEnd === null) continue;

          if (rangesOverlap(start, end, existingStart, existingEnd)) {
            problems.push({
              type: "conflict",
              message: `${item.place} уже занято командой ${event.team_year} с ${existingItem.start} до ${existingItem.end}.`,
            });
          }
        }
      }
    }

    return problems;
  }

  function toggleTrainingPlace(place) {
    setTrainingData((prev) => {
      const exists = !!prev[place];
      const next = { ...prev };

      if (place === "Зал") {
        if (exists) {
          delete next["Зал"];
        } else {
          next["Зал"] = {
            start: "",
            end: "",
            field_size: "",
          };
        }

        return next;
      }

      fieldTrainingPlaces.forEach((fieldPlace) => {
        delete next[fieldPlace];
      });

      if (!exists) {
        next[place] = {
          start: "",
          end: "",
          field_size: "Полное поле",
        };
      }

      return next;
    });
  }

  function updateTrainingPlace(place, field, value) {
    setTrainingData((prev) => ({
      ...prev,
      [place]: {
        ...(prev[place] || {}),
        [field]: value,
      },
    }));
  }

  function resetDynForm() {
    setEditingEventId(null);
    setDynEventType("training");
    setTrainingData({});
    setActiveTimeTarget(null);
    setMatchHomeAway("home");
    setMatchTime("");
    setMatchTournament("");
    setMatchOpponent("");
    setMatchPlace("Родина №1");
  }

  function startEditEvent(event) {
    setEditingEventId(event.id);
    setDynYear(Number(event.team_year));
    setDynSelectedDate(event.event_date);
    setDynEventType(event.event_type);
    setActiveTimeTarget(null);

    if (event.event_type === "training") {
      const next = {};
      let fieldAlreadySelected = false;

      (event.training_items || []).forEach((item) => {
        const isField = fieldTrainingPlaces.includes(item.place);

        if (isField && fieldAlreadySelected) return;
        if (isField) fieldAlreadySelected = true;

        next[item.place] = {
          start: item.start || "",
          end: item.end || "",
          field_size: item.field_size || "",
        };
      });

      setTrainingData(next);
    } else {
      setTrainingData({});
    }

    if (event.event_type === "match") {
      setMatchHomeAway(event.match_home_away || "home");
      setMatchTime(event.match_time || "");
      setMatchTournament(event.tournament || "");
      setMatchOpponent(event.opponent || "");
      setMatchPlace(event.match_place || "Родина №1");
    } else {
      setMatchHomeAway("home");
      setMatchTime("");
      setMatchTournament("");
      setMatchOpponent("");
      setMatchPlace("Родина №1");
    }
  }

  async function saveDynEvent() {
    setError("");

    if (!dynSelectedDate) {
      setError("Выбери день.");
      return;
    }

    const exists = existingSelectedEvent();

    if (exists && !editingEventId) {
      setError("На эту дату у этой команды уже есть событие. Нажми «Изменить существующее».");
      return;
    }

    let payload = {
      team_year: dynYear,
      event_date: dynSelectedDate,
      event_type: dynEventType,
      training_items: [],
      match_home_away: null,
      match_time: null,
      tournament: null,
      opponent: null,
      match_place: null,
      updated_at: new Date().toISOString(),
    };

    if (dynEventType === "training") {
      const items = Object.entries(trainingData).map(([place, data]) => ({
        place,
        start: data.start || "",
        end: data.end || "",
        field_size: place === "Зал" ? "" : data.field_size || "Полное поле",
      }));

      const fieldItems = items.filter((item) => fieldTrainingPlaces.includes(item.place));

      if (fieldItems.length > 1) {
        setError("Можно выбрать только одно поле. Зал можно добавить дополнительно.");
        return;
      }

      if (!items.length) {
        setError("Выбери хотя бы одно место тренировки.");
        return;
      }

      const hasEmptyTime = items.some((item) => !item.start || !item.end);

      if (hasEmptyTime) {
        setError("Укажи время начала и окончания для каждой выбранной тренировки.");
        return;
      }

      const problems = getTrainingProblems();

      if (problems.length) {
        setError(problems[0].message);
        return;
      }

      payload.training_items = items;
    }

    if (dynEventType === "match") {
      if (!matchTime || !matchTournament.trim() || !matchOpponent.trim() || !matchPlace.trim()) {
        setError("Заполни время, турнир, соперника и место матча.");
        return;
      }

      payload.match_home_away = matchHomeAway;
      payload.match_time = matchTime;
      payload.tournament = matchTournament.trim();
      payload.opponent = matchOpponent.trim();
      payload.match_place = matchPlace.trim();
    }

    let result;

    if (editingEventId) {
      result = await supabase
        .from("dynamovets_schedule_events")
        .update(payload)
        .eq("id", editingEventId);
    } else {
      result = await supabase.from("dynamovets_schedule_events").insert(payload);
    }

    if (result.error) {
      setError("Ошибка сохранения события: " + result.error.message);
      return;
    }

    resetDynForm();
    await loadDynamovetsData();
  }

  async function deleteDynEvent(id) {
    const ok = window.confirm("Удалить событие?");
    if (!ok) return;

    const { error } = await supabase.from("dynamovets_schedule_events").delete().eq("id", id);

    if (error) {
      setError("Ошибка удаления события: " + error.message);
      return;
    }

    if (editingEventId === id) resetDynForm();
    await loadDynamovetsData();
  }

  function updateTrainerLocal(year, value) {
    setDynTrainers((prev) => {
      const exists = prev.find((t) => Number(t.team_year) === Number(year));

      if (exists) {
        return prev.map((t) =>
          Number(t.team_year) === Number(year) ? { ...t, trainer_name: value } : t
        );
      }

      return [...prev, { team_year: year, trainer_name: value }];
    });
  }

  async function saveTrainers() {
    const payload = dynamovetsYears.map((year) => ({
      team_year: year,
      trainer_name: trainerName(year),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("dynamovets_trainers").upsert(payload, {
      onConflict: "team_year",
    });

    if (error) {
      setError("Ошибка сохранения тренеров: " + error.message);
      return;
    }

    alert("Тренеры сохранены");
    await loadDynamovetsData();
  }

  async function downloadSchedulePng() {
    const node = scheduleRef.current;
    if (!node) return;

    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: node.scrollWidth,
        height: node.scrollHeight,
        style: {
          transform: "none",
        },
      });

      const link = document.createElement("a");
      link.download = `Динамовец_${selectedWeek?.label || "расписание"}_2026.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      setError("Не удалось создать PNG: " + e.message);
    }
  }

  return (
    <div className="app">
      <div className="app-container">
        <header className="topbar">
          <div className="brand-block">
            <div className="brand-word">РОДИНА</div>
            <div className="brand-sub">Академия Динамовец</div>
          </div>

          <div className="title-block">
            <h1>{pageTitle}</h1>
            <p>Такси, пицца и расписание академий</p>
          </div>

          <div className="status-pill">
            <span className="status-dot" />
            {status}
          </div>
        </header>

        <nav className="main-tabs">
          <button className={page === "calc" ? "tab active" : "tab"} onClick={() => setPage("calc")}>
            Расчёт аванса
          </button>
          <button className={page === "manual" ? "tab active" : "tab"} onClick={() => setPage("manual")}>
            Ручные матчи
          </button>
          <button className={page === "tariffs" ? "tab active" : "tab"} onClick={() => setPage("tariffs")}>
            Тарифы
          </button>
          <button
            className={page === "dynamovets" ? "tab active" : "tab"}
            onClick={() => setPage("dynamovets")}
          >
            Расписание Динамовец
          </button>
        </nav>

        {error && <div className="error">{error}</div>}

        {page === "calc" && (
          <>
            <section className="card">
              <div className="card-header">
                <h2>Месяц</h2>
              </div>

              <div className="pill-group">
                {advanceMonths.map(([num, name]) => (
                  <button
                    key={num}
                    className={month === num ? "pill active" : "pill"}
                    onClick={() => {
                      setMonth(num);
                      setSelected({});
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <button className="btn btn-outline" onClick={refreshGoogleMatches}>
                Обновить Google-таблицу
              </button>
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Матчи месяца</h2>
              </div>

              <div className="matches">
                {currentMatches.length === 0 && (
                  <div className="empty">
                    <div className="empty-icon">⚽</div>
                    <b>Матчей нет</b>
                    <span>В выбранном месяце нет матчей.</span>
                  </div>
                )}

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
                      <button
                        className={s.taxi ? "service on" : "service"}
                        onClick={() => toggle(m.id, "taxi")}
                      >
                        Такси
                      </button>
                      <button
                        className={s.pizza ? "service on" : "service"}
                        onClick={() => toggle(m.id, "pizza")}
                      >
                        Пицца
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Итоговая таблица</h2>
              </div>

              <Table rows={selectedRows} />

              <div className="total">ИТОГО: {money(total)}</div>

              <button className="btn btn-primary" onClick={printPdf}>
                PDF / печать
              </button>
            </section>
          </>
        )}

        {page === "manual" && (
          <section className="card">
            <div className="card-header">
              <h2>Ручные матчи</h2>
            </div>

            <div className="form-stack">
              <div className="form-group">
                <label>Команда</label>
                <div className="pill-group">
                  {manualTeams.map((t) => (
                    <button
                      key={t}
                      className={formTeam === t ? "pill active" : "pill"}
                      onClick={() => setFormTeam(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Месяц</label>
                <div className="pill-group">
                  {advanceMonths.map(([num, name]) => (
                    <button
                      key={num}
                      className={formMonth === num ? "pill active" : "pill"}
                      onClick={() => setFormMonth(num)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>День</label>
                  <input value={formDay} onChange={(e) => setFormDay(e.target.value)} placeholder="12" />
                </div>

                <div className="form-group">
                  <label>Соперник</label>
                  <input
                    value={formOpponent}
                    onChange={(e) => setFormOpponent(e.target.value)}
                    placeholder="Спартак"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Тип матча</label>
                <div className="pill-group">
                  <button
                    className={formType === "дом" ? "pill active" : "pill"}
                    onClick={() => setFormType("дом")}
                  >
                    Дом
                  </button>
                  <button
                    className={formType === "выезд" ? "pill active" : "pill"}
                    onClick={() => setFormType("выезд")}
                  >
                    Выезд
                  </button>
                </div>
              </div>

              <button className="btn btn-primary" onClick={addManualMatch}>
                Добавить матч
              </button>
            </div>

            <h3>Добавленные матчи</h3>

            <table className="data-table">
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
                      <button className="btn-small danger" onClick={() => deleteManualMatch(m.id)}>
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
            <div className="card-header">
              <h2>Тарифы</h2>
            </div>

            <div className="tariff-list">
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
            </div>

            <button className="btn btn-primary" onClick={saveTariffs}>
              Сохранить тарифы
            </button>
          </section>
        )}

        {page === "dynamovets" && (
          <>
            <section className="card compact-card">
              <div className="card-header">
                <h2>Расписание Динамовец</h2>
              </div>

              <div className="sub-tabs">
                <button
                  className={dynTab === "schedule" ? "sub-tab active" : "sub-tab"}
                  onClick={() => setDynTab("schedule")}
                >
                  Расписание
                </button>
                <button
                  className={dynTab === "trainers" ? "sub-tab active" : "sub-tab"}
                  onClick={() => setDynTab("trainers")}
                >
                  Тренеры
                </button>
              </div>
            </section>

            {dynTab === "trainers" && (
              <section className="card">
                <div className="card-header">
                  <h2>Тренеры Динамовца</h2>
                </div>

                <div className="trainer-grid">
                  {dynamovetsYears.map((year) => (
                    <div className="trainer-row" key={year}>
                      <b>{year}</b>
                      <input
                        value={trainerName(year)}
                        onChange={(e) => updateTrainerLocal(year, e.target.value)}
                        placeholder="Имя Фамилия"
                      />
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary" onClick={saveTrainers}>
                  Сохранить тренеров
                </button>
              </section>
            )}

            {dynTab === "schedule" && (
              <>
                <section className="card">
                  <div className="card-header">
                    <h2>Выбор периода</h2>
                  </div>

                  <div className="form-group">
                    <label>Месяц 2026</label>
                    <div className="pill-group">
                      {yearMonths.map(([num, name]) => (
                        <button
                          key={num}
                          className={dynMonth === num ? "pill active" : "pill"}
                          onClick={() => {
                            const weeks = getWeeksForMonth2026(num);
                            setDynMonth(num);
                            setDynWeekStart(weeks[0]?.startIso || "");
                            setDynSelectedDate(weeks[0]?.days[0]?.iso || "");
                          }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Неделя</label>
                    <div className="pill-group">
                      {dynWeeks.map((w) => (
                        <button
                          key={w.startIso}
                          className={dynWeekStart === w.startIso ? "pill active" : "pill"}
                          onClick={() => {
                            setDynWeekStart(w.startIso);
                            setDynSelectedDate(w.days[0].iso);
                          }}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>День</label>
                    <div className="pill-group">
                      {(selectedWeek?.days || []).map((d) => (
                        <button
                          key={d.iso}
                          className={dynSelectedDate === d.iso ? "pill active" : "pill"}
                          onClick={() => setDynSelectedDate(d.iso)}
                        >
                          {d.label} {d.date}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="card">
                  <div className="card-header">
                    <h2>{editingEventId ? "Изменить событие" : "Добавить событие"}</h2>
                  </div>

                  <div className="form-group">
                    <label>Команда / год</label>
                    <div className="pill-group">
                      {dynamovetsYears.map((year) => (
                        <button
                          key={year}
                          className={dynYear === year ? "pill active" : "pill"}
                          onClick={() => setDynYear(year)}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </div>

                  {existingSelectedEvent() && !editingEventId && (
                    <div className="notice">
                      На эту дату у {dynYear} уже есть событие.
                      <div className="notice-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() => startEditEvent(existingSelectedEvent())}
                        >
                          Изменить существующее
                        </button>
                        <button className="btn btn-danger" onClick={() => deleteDynEvent(existingSelectedEvent().id)}>
                          Удалить
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Тип события</label>
                    <div className="segmented">
                      <button
                        className={dynEventType === "training" ? "segment active" : "segment"}
                        onClick={() => setDynEventType("training")}
                      >
                        Тренировка
                      </button>
                      <button
                        className={dynEventType === "match" ? "segment active" : "segment"}
                        onClick={() => setDynEventType("match")}
                      >
                        Матч
                      </button>
                      <button
                        className={dynEventType === "day_off" ? "segment active" : "segment"}
                        onClick={() => setDynEventType("day_off")}
                      >
                        Выходной
                      </button>
                    </div>
                  </div>

                  {dynEventType === "training" && (
                    <div className="form-group">
                      <label>Место тренировки</label>
                      <div className="place-grid">
                        {trainingPlaces.map((place) => (
                          <button
                            key={place}
                            className={trainingData[place] ? "place-card active" : "place-card"}
                            onClick={() => toggleTrainingPlace(place)}
                          >
                            {place}
                          </button>
                        ))}
                      </div>

                      {trainingProblems.length > 0 && (
                        <div className="notice danger-notice">
                          {trainingProblems.map((problem, index) => (
                            <div key={index}>{problem.message}</div>
                          ))}
                        </div>
                      )}

                      <div className="training-items-list">
                        {Object.entries(trainingData).map(([place, data]) => (
                          <div className="training-item-form" key={place}>
                            <div className="training-place-title">{place}</div>

                            <TimePicker
                              label="Начало"
                              value={data.start || ""}
                              targetKey={`${place}-start`}
                              activeTimeTarget={activeTimeTarget}
                              setActiveTimeTarget={setActiveTimeTarget}
                              onChange={(value) => updateTrainingPlace(place, "start", value)}
                            />

                            <TimePicker
                              label="Окончание"
                              value={data.end || ""}
                              targetKey={`${place}-end`}
                              activeTimeTarget={activeTimeTarget}
                              setActiveTimeTarget={setActiveTimeTarget}
                              onChange={(value) => updateTrainingPlace(place, "end", value)}
                            />

                            {place !== "Зал" && (
                              <div className="field-size-buttons">
                                <button
                                  className={data.field_size === "Полное поле" ? "pill active" : "pill"}
                                  onClick={() => updateTrainingPlace(place, "field_size", "Полное поле")}
                                >
                                  Полное поле
                                </button>
                                <button
                                  className={data.field_size === "1/2 поля" ? "pill active" : "pill"}
                                  onClick={() => updateTrainingPlace(place, "field_size", "1/2 поля")}
                                >
                                  1/2 поля
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dynEventType === "match" && (
                    <div className="form-stack">
                      <div className="form-group">
                        <label>Дом / выезд</label>
                        <div className="pill-group">
                          <button
                            className={matchHomeAway === "home" ? "pill active" : "pill"}
                            onClick={() => {
                              setMatchHomeAway("home");
                              setMatchPlace("Родина №1");
                            }}
                          >
                            Дом
                          </button>
                          <button
                            className={matchHomeAway === "away" ? "pill active" : "pill"}
                            onClick={() => {
                              setMatchHomeAway("away");
                              setMatchPlace("");
                            }}
                          >
                            Выезд
                          </button>
                        </div>
                      </div>

                      <TimePicker
                        label="Время матча"
                        value={matchTime}
                        targetKey="match-time"
                        activeTimeTarget={activeTimeTarget}
                        setActiveTimeTarget={setActiveTimeTarget}
                        onChange={setMatchTime}
                      />

                      <div className="form-grid">
                        <div className="form-group">
                          <label>Турнир</label>
                          <input
                            value={matchTournament}
                            onChange={(e) => setMatchTournament(e.target.value)}
                            placeholder="ЛПМ"
                          />
                        </div>

                        <div className="form-group">
                          <label>Соперник</label>
                          <input
                            value={matchOpponent}
                            onChange={(e) => setMatchOpponent(e.target.value)}
                            placeholder="Космос"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Поле / стадион</label>
                        {matchHomeAway === "home" ? (
                          <div className="pill-group">
                            {homeMatchPlaces.map((place) => (
                              <button
                                key={place}
                                className={matchPlace === place ? "pill active" : "pill"}
                                onClick={() => setMatchPlace(place)}
                              >
                                {place}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            value={matchPlace}
                            onChange={(e) => setMatchPlace(e.target.value)}
                            placeholder="Стадион / поле"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="action-row">
                    <button className="btn btn-primary" onClick={saveDynEvent}>
                      {editingEventId ? "Сохранить изменения" : "Сохранить событие"}
                    </button>

                    {editingEventId && (
                      <button className="btn btn-outline" onClick={resetDynForm}>
                        Отмена редактирования
                      </button>
                    )}
                  </div>
                </section>

                <section className="card">
                  <div className="card-header split">
                    <h2>Таблица расписания</h2>
                    <button className="btn btn-primary" onClick={downloadSchedulePng}>
                      Скачать PNG
                    </button>
                  </div>

                  <div className="schedule-scroll">
                    <div className="schedule-export" ref={scheduleRef}>
                      <div className="schedule-titlebar">АКАДЕМИЯ ДИНАМОВЕЦ</div>

                      <table className="schedule-table">
                        <thead>
                          <tr>
                            <th>Год</th>
                            <th>Тренер</th>
                            {(selectedWeek?.days || []).map((d) => (
                              <th key={d.iso}>
                                {d.label}
                                <br />
                                {d.date}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dynamovetsYears.map((year) => (
                            <tr key={year}>
                              <td className="year-cell">{year}</td>
                              <td className="trainer-cell">{trainerName(year)}</td>
                              {(selectedWeek?.days || []).map((d) => {
                                const ev = eventFor(year, d.iso);

                                return (
                                  <td key={d.iso} className="schedule-cell">
                                    <ScheduleEventView event={ev} />
                                    {ev && (
                                      <div className="cell-actions">
                                        <button onClick={() => startEditEvent(ev)}>Изм.</button>
                                        <button className="danger" onClick={() => deleteDynEvent(ev.id)}>
                                          Уд.
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="schedule-bottombar">АКАДЕМИЯ ДИНАМОВЕЦ</div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TimePicker({
  label,
  value,
  onChange,
  targetKey,
  activeTimeTarget,
  setActiveTimeTarget,
}) {
  const isOpen = activeTimeTarget === targetKey;

  return (
    <div className="time-picker">
      <label>{label}</label>

      <button
        type="button"
        className={value ? "time-main active" : "time-main"}
        onClick={() => setActiveTimeTarget(isOpen ? null : targetKey)}
      >
        {value || "Выбрать время"}
      </button>

      {isOpen && (
        <div className="time-options">
          {timeOptions.map((time) => (
            <button
              type="button"
              key={time}
              className={value === time ? "active" : ""}
              onClick={() => {
                onChange(time);
                setActiveTimeTarget(null);
              }}
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleEventView({ event }) {
  if (!event) return null;

  if (event.event_type === "day_off") {
    return <div className="day-off">Выходной</div>;
  }

  if (event.event_type === "training") {
    return (
      <div className="event-block training-block">
        {(event.training_items || []).map((item, index) => (
          <div key={index} className="training-line">
            <b>
              {item.start || "—"}–{item.end || "—"}
            </b>
            <span>Тренировка</span>
            <span>
              {item.place}
              {item.field_size ? ` · ${item.field_size}` : ""}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (event.event_type === "match") {
    const pair =
      event.match_home_away === "away"
        ? `${event.opponent} — Динамовец`
        : `Динамовец — ${event.opponent}`;

    return (
      <div className="event-block match-block">
        <b className="match-time">{event.match_time}</b>
        <span>{event.tournament}</span>
        <span>{pair}</span>
        <span>{event.match_place}</span>
      </div>
    );
  }

  return null;
}

function TariffInput({ label, value, onChange }) {
  return (
    <div className="tariff-input">
      <label>{label}, ₽</label>
      <input type="number" min="0" value={value || 0} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Table({ rows }) {
  if (!rows.length) {
    return (
      <div className="empty">
        <b>Пока не выбрано такси или пицца</b>
      </div>
    );
  }

  return (
    <table className="data-table">
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
