import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const supabaseUrl = "https://cajlcifpnsacdmcofgem.supabase.co";
const supabaseKey = "sb_publishable_fo8lRlMt0QI0Q4FJkRhYJg_ITkxGUJk";
const supabase = createClient(supabaseUrl, supabaseKey);

const SHEET_ID = "1GwTd-C6ryVqNtYZvLaZygCe3Sv8SyumRKba4c7kBCcM";
const SHEET_NAME = "Лист1";

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
const trainingPlaces = ["Поле №1", "Поле №2", "Поле №3", "Зал"];
const homeMatchPlaces = ["Родина №1", "Родина №2"];

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
  const [matchHomeAway, setMatchHomeAway] = useState("home");
  const [matchTime, setMatchTime] = useState("");
  const [matchTournament, setMatchTournament] = useState("");
  const [matchOpponent, setMatchOpponent] = useState("");
  const [matchPlace, setMatchPlace] = useState("Родина №1");

  const scheduleRef = useRef(null);

  const dynWeeks = useMemo(() => getWeeksForMonth2026(dynMonth), [dynMonth]);
  const selectedWeek = dynWeeks.find((w) => w.startIso === dynWeekStart) || dynWeeks[0];

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

  function toggleTrainingPlace(place) {
    setTrainingData((prev) => {
      const exists = !!prev[place];
      const next = { ...prev };

      if (exists) {
        delete next[place];
      } else {
        next[place] = {
          start: "",
          end: "",
          field_size: place === "Зал" ? "" : "Полное поле",
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

    if (event.event_type === "training") {
      const next = {};
      (event.training_items || []).forEach((item) => {
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

      if (!items.length) {
        setError("Выбери хотя бы одно место тренировки.");
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
      const clone = node.cloneNode(true);
      clone.style.background = "white";

      let css = "";
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          css += Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
          // пропускаем внешние стили, если браузер не даёт их читать
        }
      }

      const html = `
        <html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <style>
              body { margin: 0; background: white; }
              ${css}
            </style>
          </head>
          <body>${clone.outerHTML}</body>
        </html>
      `;

      const width = Math.max(node.scrollWidth, 1200);
      const height = Math.max(node.scrollHeight, 500);

      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            ${html}
          </foreignObject>
        </svg>
      `;

      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width * 2;
        canvas.height = height * 2;

        const ctx = canvas.getContext("2d");
        ctx.scale(2, 2);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);

        URL.revokeObjectURL(url);

        const a = document.createElement("a");
        a.download = `Динамовец_${selectedWeek?.label || "расписание"}_2026.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      };

      img.src = url;
    } catch (e) {
      setError("Не удалось скачать PNG: " + e.message);
    }
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>Расчёт аванса</h1>
          <p>Такси, пицца и расписание академий</p>
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
        <button className={page === "dynamovets" ? "active" : ""} onClick={() => setPage("dynamovets")}>
          Расписание Динамовец
        </button>
      </nav>

      {error && <div className="error">{error}</div>}

      {page === "calc" && (
        <>
          <section className="card">
            <h2>Месяц</h2>
            <div className="buttons">
              {advanceMonths.map(([num, name]) => (
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

          <div className="manual-form">
            <div className="form-group">
              <label>Команда</label>
              <div className="buttons">
                {manualTeams.map((t) => (
                  <button key={t} className={formTeam === t ? "active" : ""} onClick={() => setFormTeam(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Месяц</label>
              <div className="buttons">
                {advanceMonths.map(([num, name]) => (
                  <button key={num} className={formMonth === num ? "active" : ""} onClick={() => setFormMonth(num)}>
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>День</label>
              <input value={formDay} onChange={(e) => setFormDay(e.target.value)} placeholder="12" />
            </div>

            <div className="form-group">
              <label>Соперник</label>
              <input value={formOpponent} onChange={(e) => setFormOpponent(e.target.value)} placeholder="Спартак" />
            </div>

            <div className="form-group">
              <label>Тип матча</label>
              <div className="buttons">
                <button className={formType === "дом" ? "active" : ""} onClick={() => setFormType("дом")}>
                  Дом
                </button>
                <button className={formType === "выезд" ? "active" : ""} onClick={() => setFormType("выезд")}>
                  Выезд
                </button>
              </div>
            </div>

            <div className="manual-actions">
              <button className="primary add-match-button" onClick={addManualMatch}>
                Добавить матч
              </button>
            </div>
          </div>

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

      {page === "dynamovets" && (
        <>
          <section className="card">
            <h2>Расписание Динамовец</h2>
            <div className="buttons">
              <button className={dynTab === "schedule" ? "active" : ""} onClick={() => setDynTab("schedule")}>
                Расписание
              </button>
              <button className={dynTab === "trainers" ? "active" : ""} onClick={() => setDynTab("trainers")}>
                Тренеры
              </button>
            </div>
          </section>

          {dynTab === "trainers" && (
            <section className="card">
              <h2>Тренеры Динамовца</h2>

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

              <button className="primary" onClick={saveTrainers}>
                Сохранить тренеров
              </button>
            </section>
          )}

          {dynTab === "schedule" && (
            <>
              <section className="card">
                <h2>Выбор периода</h2>

                <label>Месяц 2026</label>
                <div className="buttons">
                  {yearMonths.map(([num, name]) => (
                    <button
                      key={num}
                      className={dynMonth === num ? "active" : ""}
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

                <label>Неделя</label>
                <div className="buttons">
                  {dynWeeks.map((w) => (
                    <button
                      key={w.startIso}
                      className={dynWeekStart === w.startIso ? "active" : ""}
                      onClick={() => {
                        setDynWeekStart(w.startIso);
                        setDynSelectedDate(w.days[0].iso);
                      }}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>

                <label>День</label>
                <div className="buttons">
                  {(selectedWeek?.days || []).map((d) => (
                    <button
                      key={d.iso}
                      className={dynSelectedDate === d.iso ? "active" : ""}
                      onClick={() => setDynSelectedDate(d.iso)}
                    >
                      {d.label} {d.date}
                    </button>
                  ))}
                </div>
              </section>

              <section className="card">
                <h2>{editingEventId ? "Изменить событие" : "Добавить событие"}</h2>

                <div className="form-group">
                  <label>Команда / год</label>
                  <div className="buttons">
                    {dynamovetsYears.map((year) => (
                      <button key={year} className={dynYear === year ? "active" : ""} onClick={() => setDynYear(year)}>
                        {year}
                      </button>
                    ))}
                  </div>
                </div>

                {existingSelectedEvent() && !editingEventId && (
                  <div className="notice">
                    На эту дату у {dynYear} уже есть событие. Можно изменить существующее или удалить его.
                    <div className="notice-actions">
                      <button className="primary" onClick={() => startEditEvent(existingSelectedEvent())}>
                        Изменить существующее
                      </button>
                      <button className="danger" onClick={() => deleteDynEvent(existingSelectedEvent().id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Тип события</label>
                  <div className="buttons">
                    <button className={dynEventType === "training" ? "active" : ""} onClick={() => setDynEventType("training")}>
                      Тренировка
                    </button>
                    <button className={dynEventType === "match" ? "active" : ""} onClick={() => setDynEventType("match")}>
                      Матч
                    </button>
                    <button className={dynEventType === "day_off" ? "active" : ""} onClick={() => setDynEventType("day_off")}>
                      Выходной
                    </button>
                  </div>
                </div>

                {dynEventType === "training" && (
                  <div className="form-group">
                    <label>Место тренировки</label>
                    <div className="buttons">
                      {trainingPlaces.map((place) => (
                        <button
                          key={place}
                          className={trainingData[place] ? "active" : ""}
                          onClick={() => toggleTrainingPlace(place)}
                        >
                          {place}
                        </button>
                      ))}
                    </div>

                    {Object.entries(trainingData).map(([place, data]) => (
                      <div className="training-item-form" key={place}>
                        <b>{place}</b>
                        <input
                          type="time"
                          value={data.start || ""}
                          onChange={(e) => updateTrainingPlace(place, "start", e.target.value)}
                        />
                        <input
                          type="time"
                          value={data.end || ""}
                          onChange={(e) => updateTrainingPlace(place, "end", e.target.value)}
                        />

                        {place !== "Зал" && (
                          <div className="buttons">
                            <button
                              className={data.field_size === "Полное поле" ? "active" : ""}
                              onClick={() => updateTrainingPlace(place, "field_size", "Полное поле")}
                            >
                              Полное поле
                            </button>
                            <button
                              className={data.field_size === "1/2 поля" ? "active" : ""}
                              onClick={() => updateTrainingPlace(place, "field_size", "1/2 поля")}
                            >
                              1/2 поля
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {dynEventType === "match" && (
                  <div className="match-form">
                    <label>Дом / выезд</label>
                    <div className="buttons">
                      <button
                        className={matchHomeAway === "home" ? "active" : ""}
                        onClick={() => {
                          setMatchHomeAway("home");
                          setMatchPlace("Родина №1");
                        }}
                      >
                        Дом
                      </button>
                      <button
                        className={matchHomeAway === "away" ? "active" : ""}
                        onClick={() => {
                          setMatchHomeAway("away");
                          setMatchPlace("");
                        }}
                      >
                        Выезд
                      </button>
                    </div>

                    <label>Время матча</label>
                    <input type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} />

                    <label>Турнир</label>
                    <input value={matchTournament} onChange={(e) => setMatchTournament(e.target.value)} placeholder="ЛПМ" />

                    <label>Соперник</label>
                    <input value={matchOpponent} onChange={(e) => setMatchOpponent(e.target.value)} placeholder="Космос" />

                    <label>Поле / стадион</label>
                    {matchHomeAway === "home" ? (
                      <div className="buttons">
                        {homeMatchPlaces.map((place) => (
                          <button key={place} className={matchPlace === place ? "active" : ""} onClick={() => setMatchPlace(place)}>
                            {place}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input value={matchPlace} onChange={(e) => setMatchPlace(e.target.value)} placeholder="Стадион / поле" />
                    )}
                  </div>
                )}

                <div className="manual-actions">
                  <button className="primary add-match-button" onClick={saveDynEvent}>
                    {editingEventId ? "Сохранить изменения" : "Сохранить событие"}
                  </button>
                  {editingEventId && (
                    <button className="secondary" onClick={resetDynForm}>
                      Отмена редактирования
                    </button>
                  )}
                </div>
              </section>

              <section className="card">
                <div className="schedule-toolbar">
                  <h2>Таблица расписания</h2>
                  <button className="primary" onClick={downloadSchedulePng}>
                    Скачать PNG
                  </button>
                </div>

                <div className="schedule-wrap" ref={scheduleRef}>
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
                </div>
              </section>
            </>
          )}
        </>
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
