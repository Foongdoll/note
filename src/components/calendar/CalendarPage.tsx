// components/calendar/CalendarPage.tsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Plus, Edit2, Asterisk } from "lucide-react";
import {
  isAfter, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameDay, isSameMonth, parseISO, compareAsc
} from "date-fns";
import type { CalendarEvent, ScheduleType } from "../../types";

// 달력 그리드 생성
const getMonthMatrix = (year: number, month: number) => {
  const matrix: Date[][] = [];
  let start = startOfWeek(startOfMonth(new Date(year, month)), { weekStartsOn: 0 });
  let end = endOfWeek(endOfMonth(new Date(year, month)), { weekStartsOn: 0 });

  let rows = [];
  let curr = start;
  while (curr <= end) {
    rows = [];
    for (let i = 0; i < 7; i++) {
      rows.push(curr);
      curr = addDays(curr, 1);
    }
    matrix.push(rows);
  }
  return matrix;
};

const typeColors: Record<ScheduleType, string> = {
  기념일: "bg-pink-200/70 text-pink-600",
  시험: "bg-amber-200/80 text-amber-600",
  약속: "bg-sky-200/80 text-sky-600",
  공부: "bg-green-200/80 text-green-600",
  일정: "bg-gray-200/70 text-gray-500",
};

// 일정 날짜 구간 배열 생성
function getDateRangeArray(start: Date, end: Date) {
  const dates: Date[] = [];
  let curr = start;
  while (!isAfter(curr, end)) {
    dates.push(curr);
    curr = addDays(curr, 1);
  }
  return dates;
}

export const CalendarPage: React.FC = () => {
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI?.loadEvents?.().then((data) => {
      if (data) setEvents(data);
    });
  }, []);

  const handleSaveEvent = (e: CalendarEvent) => {
    // 기존에 id가 있는지로 분기 (편집이든 신규든 id로 찾음)
    const exists = events.some(ev => ev.id === e.id);
    let updated;
    if (exists) {
      updated = events.map(ev => ev.id === e.id ? e : ev);
    } else {
      updated = [...events, e];
    }
    setEvents(updated);
    window.electronAPI?.saveEvents?.(updated);
    setModalOpen(false);
    setEditing(null);
  };

  const handleDeleteEvent = (id: string) => {
    const updated = events.filter(ev => ev.id !== id);
    setEvents(updated);
    window.electronAPI?.saveEvents?.(updated);
    setDetail(null);
  };

  // 달력 행렬
  const matrix = getMonthMatrix(current.getFullYear(), current.getMonth());

  // 날짜별 일정 맵 (여러개, 기간 걸친 일정 모두 포함)
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  events.forEach(ev => {
    const startDate = parseISO(ev.start);
    const endDate = parseISO(ev.end);
    getDateRangeArray(startDate, endDate).forEach(d => {
      const key = format(d, "yyyy-MM-dd");
      if (!eventsByDate[key]) eventsByDate[key] = [];
      eventsByDate[key].push(ev);
    });
  });

  // 각 날짜별 시간순 정렬
  Object.values(eventsByDate).forEach(evList => {
    evList.sort((a, b) =>
      compareAsc(parseISO(a.start), parseISO(b.start))
    );
  });

  // 일정 추가 모달 기본값
  const openNewEvent = (date: Date) => {
    setEditing({
      id: "ev-" + Date.now(),
      type: "일정",
      title: "",
      description: "",
      participants: "",
      start: format(date, "yyyy-MM-dd'T'HH:mm"),
      end: format(date, "yyyy-MM-dd'T'HH:mm"),
      items: "",
      place: "",
      note: "",
      important: false,
    });
    setModalOpen(true);
    setSelectedDate(format(date, "yyyy-MM-dd"));
  };

  // 하루 클릭 시 해당 날짜의 모든 일정 상세 보기
  const openDayDetail = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    setSelectedDate(key);
    setDetail(null); // 하루 상세만 보려고
  };

  return (
    <div className="p-6 w-full h-full bg-gradient-to-br from-indigo-50 to-pink-100 min-h-screen flex flex-col items-center">
      {/* 캘린더 헤더 */}
      <div className="flex items-center gap-4 mb-5 w-full max-w-4xl justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/60 shadow text-indigo-400 text-lg hover:scale-110 transition">
            &lt;
          </button>
          <span className="text-2xl md:text-3xl font-black text-indigo-700 drop-shadow-[0_1px_#fff8] select-none">
            {format(current, "yyyy년 MM월")}
          </span>
          <button onClick={() => setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/60 shadow text-indigo-400 text-lg hover:scale-110 transition">
            &gt;
          </button>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/90 text-white text-base font-extrabold shadow hover:bg-indigo-600 transition"
          onClick={() => openNewEvent(new Date())}
        >
          <Plus size={20} /> 일정등록
        </button>
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7 border-2 rounded-2xl bg-white/95 overflow-hidden drop-shadow-xl max-w-4xl w-full text-[15px]">
        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
          <div
            key={d}
            className={`py-2 text-center font-extrabold text-[15px] 
              ${i === 0 ? "text-pink-500 bg-pink-50" : i === 6 ? "text-blue-500 bg-blue-50" : "bg-indigo-50 text-indigo-400"}`}>
            {d}
          </div>
        ))}
        {matrix.flat().map((date) => {
          const key = format(date, "yyyy-MM-dd");
          const inMonth = isSameMonth(date, current);
          const todays = eventsByDate[key] || [];
          const weekDay = date.getDay();
          return (
            <div
              key={key}
              className={`
                min-h-[100px] max-h-[220px] border-t border-l last:border-r p-1.5 cursor-pointer group relative
                ${inMonth ? "bg-white" : "bg-gray-50 text-gray-300"}
                ${weekDay === 0 ? "bg-pink-50" : weekDay === 6 ? "bg-blue-50" : ""}
                rounded transition
                hover:z-10 hover:scale-[1.04] hover:ring-2 hover:ring-indigo-200
                overflow-y-auto
              `}
              onClick={() => openDayDetail(date)}
              style={{ fontFamily: "DungGeunMo, Pretendard, sans-serif" }}
            >
              <span
                className={`
                  absolute left-2 top-1 text-xs font-bold 
                  ${isSameDay(date, new Date()) ? "text-indigo-600 bg-indigo-100 rounded px-1 py-0.5" : ""}
                  ${weekDay === 0 ? "text-pink-400" : weekDay === 6 ? "text-blue-400" : ""}
                `}
              >{date.getDate()}</span>
              {/* 일정 표시 */}
              <div className="flex flex-col gap-1 mt-5">
                {todays.map(ev => {
                  // 오늘 날짜가 시작일이 아닌 경우 "예정" 표시
                  const isFirstDay = format(parseISO(ev.start), "yyyy-MM-dd") === key;
                  // 일정 시작/끝 시간 HH:mm
                  const startTime = format(parseISO(ev.start), "HH:mm");
                  return (
                    <div key={ev.id} className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer
        ${typeColors[ev.type]} hover:bg-indigo-100 text-xs font-bold`}
                      onClick={e => { e.stopPropagation(); setDetail(ev); setSelectedDate(key); }}>
                      {ev.important &&
                        <span title="중요 일정" className="mr-1">
                          <Asterisk className="text-yellow-400 drop-shadow-[0_1px_#ca8a04] animate-pulse" size={16} fill="#facc15" stroke="#eab308" />
                        </span>
                      }
                      {!isFirstDay && (
                        <span className="bg-yellow-200 text-yellow-800 px-1 rounded mr-1 text-[10px] font-bold">
                          예정
                        </span>
                      )}
                      <span className="min-w-[35px] text-indigo-900">{isFirstDay ? startTime : ""}</span>
                      <span className="truncate">{ev.title}</span>
                    </div>
                  );
                })}
              </div>
              {/* 오늘 도장 강조 */}
              {todays.some(ev => ev.important) &&
                <span
                  className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center pointer-events-none opacity-95 group-hover:scale-110 transition"
                  title="중요 일정"
                >
                  <Star className="text-yellow-400 drop-shadow-[0_1px_#ca8a04] animate-pulse" size={22} fill="#facc15" stroke="#eab308" />
                </span>
              }
            </div>
          );
        })}
      </div>

      {/* 일정 상세/수정 모달 */}
      <AnimatePresence>
        {(modalOpen || detail || selectedDate) && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              initial={{ y: 40, scale: 0.93, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 40, scale: 0.93, opacity: 0 }}
              transition={{ type: "spring", stiffness: 230, damping: 20 }}
              className="bg-white rounded-3xl shadow-2xl px-7 py-8 w-full max-w-md relative
                border-4 border-indigo-100"
              style={{ fontFamily: "DungGeunMo, Pretendard, sans-serif" }}
            >
              {/* 1. 일정 클릭: 일정 상세/수정  2. 날짜 클릭: 날짜별 전체 일정 목록 */}
              {editing ? (
                <EventDetailOrForm
                  event={editing}
                  mode="edit"
                  onClose={() => { setModalOpen(false); setEditing(null); setDetail(null); setSelectedDate(null); }}
                  onSave={handleSaveEvent}
                  onDelete={handleDeleteEvent}
                  onEdit={ev => { setEditing(ev); setDetail(null); setModalOpen(true); }}
                />
              ) : detail ? (
                <EventDetailOrForm
                  event={detail}
                  mode="detail"
                  onClose={() => { setDetail(null); setSelectedDate(null); }}
                  onSave={handleSaveEvent}
                  onDelete={handleDeleteEvent}
                  onEdit={ev => { setEditing(ev); setDetail(null); setModalOpen(true); }}
                />
              ) : selectedDate ? (
                <DayEventsList
                  date={selectedDate}
                  events={eventsByDate[selectedDate] || []}
                  onEventClick={ev => { setDetail(ev); }}
                  onAdd={() => {
                    const dt = parseISO(selectedDate + "T00:00");
                    openNewEvent(dt);
                  }}
                  onClose={() => setSelectedDate(null)}
                />
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---------- 날짜별 일정 리스트 (구글 캘린더 스타일) ----------
function DayEventsList({
  date,
  events,
  onEventClick,
  onAdd,
  onClose,
}: {
  date: string;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-bold text-indigo-700">
          {date.replace(/-/g, ".")} 일정
        </div>
        <button onClick={onClose} className="text-gray-400 text-lg font-bold px-2 hover:text-indigo-400">닫기</button>
      </div>
      <div className="flex flex-col gap-1 max-h-[320px] overflow-y-auto mb-2">
        {events.length === 0 && (
          <div className="text-gray-400 text-center py-5">일정이 없습니다.</div>
        )}
        {events
          .sort((a, b) => compareAsc(parseISO(a.start), parseISO(b.start)))
          .map(ev => (
            <div key={ev.id}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer shadow-sm border
                ${typeColors[ev.type]} hover:bg-indigo-100 text-[14px] font-bold
              `}
              onClick={() => onEventClick(ev)}
            >
              <span className="text-xs text-indigo-400 min-w-[52px] text-center">
                {format(parseISO(ev.start), "HH:mm")}~
                {format(parseISO(ev.end), "HH:mm")}
              </span>
              <span className="truncate">{ev.title}</span>
              {ev.important &&
                <Star className="text-yellow-400 ml-1" size={18} fill="#facc15" stroke="#eab308" />
              }
            </div>
          ))}
      </div>
      <button
        className="w-full py-2 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 mt-1"
        onClick={onAdd}
      >
        + 새 일정 추가
      </button>
    </div>
  );
}

// --------- 일정 상세/수정 폼 ---------
function EventDetailOrForm({
  event,
  mode,
  onClose,
  onSave,
  onDelete,
  onEdit,
}: {
  event: CalendarEvent;
  mode: "edit" | "detail";
  onClose: () => void;
  onSave: (e: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onEdit: (e: CalendarEvent) => void;
}) {
  const [form, setForm] = useState<CalendarEvent>(event);

  useEffect(() => {
    setForm(event);
  }, [event]);

  const readonly = mode === "detail";

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (!readonly) onSave(form);
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <select
          value={form.type}
          disabled={readonly}
          className="border-2 border-indigo-200 px-2 py-1 rounded-full text-xs bg-indigo-50 font-extrabold"
          onChange={e => setForm(f => ({ ...f, type: e.target.value as ScheduleType }))}
        >
          <option value="기념일">🎂 기념일</option>
          <option value="시험">📚 시험</option>
          <option value="약속">🤝 약속</option>
          <option value="공부">📝 공부</option>
          <option value="일정">🗓️ 일정</option>
        </select>
        <input
          value={form.title}
          disabled={readonly}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="일정명"
          className="font-extrabold text-[15px] border-b-2 border-indigo-100 bg-transparent px-2 py-1 flex-1 focus:outline-none"
        />
        <label className="flex items-center gap-1 ml-2 text-xs">
          <input
            type="checkbox"
            disabled={readonly}
            checked={!!form.important}
            onChange={e => setForm(f => ({ ...f, important: e.target.checked }))}
          />
          <span className="text-pink-500">중요</span>
          <span className="ml-1">{form.important &&
            <Star className="text-yellow-400 drop-shadow-[0_1px_#ca8a04] animate-pulse" size={18} fill="#facc15" stroke="#eab308" />
          }</span>
        </label>
      </div>
      <div>
        <label className="text-xs text-indigo-500 font-bold">내용</label>
        <textarea
          value={form.description}
          disabled={readonly}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full border-2 border-indigo-100 rounded-xl px-2 py-1 mt-1 text-[14px] bg-indigo-50 focus:outline-indigo-400"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-indigo-500 font-bold">참여자</label>
          <input
            value={form.participants}
            disabled={readonly}
            onChange={e => setForm(f => ({ ...f, participants: e.target.value }))}
            className="w-full border-2 border-indigo-100 rounded-xl px-2 py-1 mt-1 bg-indigo-50 text-[13px] focus:outline-indigo-400"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-indigo-500 font-bold">준비물</label>
          <input
            value={form.items}
            disabled={readonly}
            onChange={e => setForm(f => ({ ...f, items: e.target.value }))}
            className="w-full border-2 border-indigo-100 rounded-xl px-2 py-1 mt-1 bg-indigo-50 text-[13px] focus:outline-indigo-400"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-indigo-500 font-bold">시작</label>
          <input
            type="datetime-local"
            value={form.start}
            disabled={readonly}
            onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
            className="w-full border-2 border-indigo-100 rounded-xl px-2 py-1 mt-1 bg-indigo-50 text-[13px] focus:outline-indigo-400"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-indigo-500 font-bold">끝</label>
          <input
            type="datetime-local"
            value={form.end}
            disabled={readonly}
            onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
            className="w-full border-2 border-indigo-100 rounded-xl px-2 py-1 mt-1 bg-indigo-50 text-[13px] focus:outline-indigo-400"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-indigo-500 font-bold">장소</label>
          <input
            value={form.place}
            disabled={readonly}
            onChange={e => setForm(f => ({ ...f, place: e.target.value }))}
            className="w-full border-2 border-indigo-100 rounded-xl px-2 py-1 mt-1 bg-indigo-50 text-[13px] focus:outline-indigo-400"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-indigo-500 font-bold">비고</label>
          <input
            value={form.note}
            disabled={readonly}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="w-full border-2 border-indigo-100 rounded-xl px-2 py-1 mt-1 bg-indigo-50 text-[13px] focus:outline-indigo-400"
          />
        </div>
      </div>
      {/* 버튼 영역 */}
      <div className="flex justify-end gap-2 mt-2">
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-xl bg-gray-100 border text-gray-500 font-extrabold text-[14px] hover:bg-gray-200 transition">닫기</button>
        {readonly && (
          <button type="button" onClick={() => onEdit({ ...form })}
            className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-extrabold text-[14px] hover:bg-indigo-600 transition flex items-center gap-1">
            <Edit2 size={15} /> 수정
          </button>
        )}
        {!readonly && (
          <>
            <button type="submit"
              className="px-5 py-2 rounded-xl bg-green-400 text-white font-extrabold text-[15px] shadow hover:bg-green-500 transition">저장</button>
          </>
        )}
        {readonly && (
          <button type="button" onClick={() => onDelete(form.id)}
            className="px-4 py-2 rounded-xl bg-rose-200 text-rose-600 font-extrabold ml-auto text-[14px] hover:bg-rose-300 transition">삭제</button>
        )}
      </div>
    </form>
  );
}
