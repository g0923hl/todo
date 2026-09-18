'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameMonth, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, X, Settings2, Check, Trash2, ArrowUp, ArrowDown, ChevronDown, CalendarDays, ArrowRight, LogOut, Type } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const THEMES = {
  light: { page: 'bg-[#F2F2F7]', bg: 'bg-white', text: 'text-[#1C1C1E]', sub: 'text-gray-500', border: 'border-gray-200', card: 'bg-white' },
  dark: { page: 'bg-black', bg: 'bg-[#1C1C1E]', text: 'text-white', sub: 'text-gray-400', border: 'border-[#38383A]', card: 'bg-[#2C2C2E]' },
  pastel: { page: 'bg-[#F5F3EC]', bg: 'bg-[#FDFBF7]', text: 'text-[#5C5C5C]', sub: 'text-[#9C9C9C]', border: 'border-[#F0EBE1]', card: 'bg-white' },
};

const FONT_SIZES = { sm: 'text-[13px]', md: 'text-[15px]', lg: 'text-[17px]' };

const HOLIDAYS: Record<string, string> = {
  '01-01': '신정', '03-01': '삼일절', '05-05': '어린이날', '06-06': '현충일',
  '08-15': '광복절', '10-03': '개천절', '10-09': '한글날', '12-25': '성탄절',
  '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴',
  '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일', '2026-08-17': '대체공휴일',
  '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴',
  '2027-02-06': '설날 연휴', '2027-02-07': '설날', '2027-02-08': '설날 연휴', '2027-02-09': '대체공휴일',
  '2027-05-13': '부처님오신날', '2027-09-14': '추석 연휴', '2027-09-15': '추석', '2027-09-16': '추석 연휴'
};
const getHoliday = (d: Date) => HOLIDAYS[format(d, 'yyyy-MM-dd')] || HOLIDAYS[format(d, 'MM-dd')];

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  
  const [appMode, setAppMode] = useState<'light' | 'dark' | 'pastel'>('light');
  const [pointColor, setPointColor] = useState('#007AFF');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  
  const [categories, setCategories] = useState([{ id: 1, name: '기본', color: '#60A5FA' }]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#FF9999');
  const [collapsedCats, setCollapsedCats] = useState<number[]>([]);

  const [inputTitle, setInputTitle] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [events, setEvents] = useState<any[]>([]);

  // 1. 유저 로그인 상태 확인
  useEffect(() => {
    setIsClient(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. 유저가 접속하면 데이터 불러오기
  useEffect(() => {
    if (user) {
      claimMyOldDataAndFetch();
    }
  }, [user]);

  // 🔥 렌냥님의 예전 데이터를 새 계정으로 쏙 흡수하는 마법의 함수!
  const claimMyOldDataAndFetch = async () => {
    await supabase.from('todomate_settings').update({ user_id: user.id }).is('user_id', null);
    await supabase.from('todomate_todos').update({ user_id: user.id }).is('user_id', null);
    fetchSettings();
    fetchTodos();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('로그인 실패: ' + error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert('회원가입 실패: ' + error.message);
      else alert('회원가입 성공! 이제 로그인해주세요.');
    }
  };

  async function fetchSettings() {
    const { data } = await supabase.from('todomate_settings').select('*').eq('user_id', user.id).single();
    if (data) {
      if (data.app_mode) setAppMode(data.app_mode);
      if (data.point_color) setPointColor(data.point_color);
      if (data.font_size) setFontSize(data.font_size);
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
        setSelectedCategoryName(data.categories[0].name);
      }
    } else {
      await supabase.from('todomate_settings').insert([{ user_id: user.id, app_mode: 'light', point_color: '#007AFF', font_size: 'md', categories }]);
      setSelectedCategoryName(categories[0].name);
    }
  }

  const closeSettingsAndSave = async () => {
    setIsSettingsOpen(false);
    await supabase.from('todomate_settings').upsert({ user_id: user.id, app_mode: appMode, point_color: pointColor, font_size: fontSize, categories }, { onConflict: 'user_id' });
  };

  async function fetchTodos() {
    const { data } = await supabase.from('todomate_todos').select('*').eq('user_id', user.id).order('id', { ascending: true });
    if (data) {
      setEvents(data.map(d => ({
        id: d.id, date: d.target_date ? new Date(d.target_date) : new Date(), title: d.content, categoryName: d.category, isDone: d.is_completed
      })));
    }
  }

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim() || !selectedCategoryName) return;
    await supabase.from('todomate_todos').insert([{ user_id: user.id, content: inputTitle, is_completed: false, category: selectedCategoryName, target_date: format(selectedDate, 'yyyy-MM-dd') }]);
    setInputTitle(''); setIsAddModalOpen(false); fetchTodos();
  };

  const toggleEvent = async (id: number, currentStatus: boolean) => {
    setEvents(events.map(ev => ev.id === id ? { ...ev, isDone: !currentStatus } : ev));
    await supabase.from('todomate_todos').update({ is_completed: !currentStatus }).eq('id', id);
  };

  const deleteEvent = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('todomate_todos').delete().eq('id', id);
    fetchTodos();
  };

  const quickMoveEvent = async (id: number, targetDate: Date) => {
    await supabase.from('todomate_todos').update({ target_date: format(targetDate, 'yyyy-MM-dd') }).eq('id', id);
    fetchTodos();
  };

  const updateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent.title.trim()) return;
    await supabase.from('todomate_todos').update({ content: editingEvent.title, category: editingEvent.categoryName, target_date: format(editingEvent.date, 'yyyy-MM-dd') }).eq('id', editingEvent.id);
    setEditingEvent(null); fetchTodos();
  };

  const moveCategory = (index: number, dir: 'up' | 'down') => {
    const newCats = [...categories];
    if (dir === 'up' && index > 0) [newCats[index], newCats[index - 1]] = [newCats[index - 1], newCats[index]];
    else if (dir === 'down' && index < newCats.length - 1) [newCats[index], newCats[index + 1]] = [newCats[index + 1], newCats[index]];
    setCategories(newCats);
  };
  const deleteCategory = (id: number) => setCategories(categories.filter(c => c.id !== id));
  const addCategory = () => { if (newCatName.trim()) { setCategories([...categories, { id: Date.now(), name: newCatName, color: newCatColor }]); setNewCatName(''); } };
  const updateCategoryColor = (id: number, color: string) => setCategories(categories.map(c => c.id === id ? { ...c, color } : c));
  const toggleCollapse = (name: string) => setCollapsedCats(prev => prev.includes(name as any) ? prev.filter(n => n !== name as any) : [...prev, name as any]);

  const monthStart = startOfMonth(currentDate); const monthEnd = endOfMonth(monthStart);
  const startDate = view === 'month' ? startOfWeek(monthStart) : startOfWeek(currentDate);
  const endDate = view === 'month' ? endOfWeek(monthEnd) : endOfWeek(currentDate);
  const days = []; let day = startDate; while (day <= endDate) { days.push(day); day = addDays(day, 1); }

  const t = THEMES[appMode];
  const fs = FONT_SIZES[fontSize];

  if (!isClient) return <div className="min-h-screen bg-[#F2F2F7]"></div>;

  // 🔒 로그인 화면
  if (!user) {
    return (
      <main className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500 mb-6 flex items-center justify-center shadow-lg"><Check size={32} className="text-white" /></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{isLoginMode ? '환영합니다!' : '계정 만들기'}</h1>
          <p className="text-gray-500 text-sm mb-8">{isLoginMode ? '나만의 일정을 관리해보세요' : '이메일로 간편하게 가입하세요'}</p>
          <form onSubmit={handleAuth} className="w-full space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" required className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 (6자리 이상)" required minLength={6} className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all" />
            <button type="submit" className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold text-lg hover:bg-blue-600 active:scale-95 transition-all shadow-md mt-2">
              {isLoginMode ? '로그인' : '가입하기'}
            </button>
          </form>
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="mt-6 text-sm text-gray-400 hover:text-gray-600 font-medium">
            {isLoginMode ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </main>
    );
  }

  // 🔓 메인 앱 화면
  return (
    <main className={`min-h-screen ${t.page} flex items-center justify-center font-sans antialiased md:p-6 transition-colors duration-300`}>
      <div className={`w-full max-w-none md:max-w-4xl lg:max-w-5xl h-[100dvh] md:h-[85vh] ${t.bg} md:rounded-[32px] shadow-2xl flex flex-col md:flex-row relative overflow-hidden transition-colors duration-300`}>
        
        {/* ================= 좌측 사이드바 ================= */}
        <aside className={`w-full md:w-80 lg:w-96 flex flex-col shrink-0 border-b md:border-b-0 md:border-r ${t.border}`}>
          <header className="px-6 pt-10 md:pt-8 pb-4 bg-transparent shrink-0">
            <div className="flex justify-between items-center mb-6">
              <h1 className={`text-2xl font-bold tracking-tight ${t.text}`}>{format(currentDate, 'yyyy년 M월')}</h1>
              <div className="flex gap-3">
                <button onClick={() => setIsSettingsOpen(true)} className={`p-1.5 rounded-full ${t.card} border ${t.border} shadow-sm hover:opacity-70 transition`}><Settings2 size={18} className={t.sub} /></button>
                <div className={`flex ${t.card} border ${t.border} rounded-full p-0.5 shadow-sm`}>
                  <button onClick={() => setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))} className={`p-1 rounded-full hover:opacity-50 transition ${t.text}`}><ChevronLeft size={18} /></button>
                  <button onClick={() => setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))} className={`p-1 rounded-full hover:opacity-50 transition ${t.text}`}><ChevronRight size={18} /></button>
                </div>
              </div>
            </div>
            <div className={`flex p-1 ${t.page} rounded-[9px] relative shadow-inner`}>
              <motion.div className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md shadow-sm opacity-20" style={{ backgroundColor: pointColor }} layout transition={{ type: "spring", stiffness: 400, damping: 30 }} initial={false} animate={{ x: view === 'month' ? 4 : '100%' }} />
              <button onClick={() => setView('month')} className={`flex-1 py-1.5 text-[12px] font-bold z-10 ${view === 'month' ? t.text : t.sub}`}>월간</button>
              <button onClick={() => setView('week')} className={`flex-1 py-1.5 text-[12px] font-bold z-10 ${view === 'week' ? t.text : t.sub}`}>주간</button>
            </div>
          </header>

          <div className="px-4 pb-4 shrink-0">
            <div className="grid grid-cols-7 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => <div key={d} className={`text-center text-[11px] font-semibold ${i === 0 ? 'text-red-400/80' : i === 6 ? 'text-blue-400/80' : t.sub}`}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-3">
              {days.map((date, i) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                const isCurrentMonth = isSameMonth(date, currentDate);
                const dayEvents = events.filter(e => isSameDay(e.date, date));
                const holiday = getHoliday(date);
                const isRedDay = holiday || date.getDay() === 0;

                return (
                  <div key={i} onClick={() => setSelectedDate(date)} className="flex flex-col items-center cursor-pointer h-10 relative group">
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-[14px] transition-colors
                      ${isSelected ? 'text-white font-bold shadow-md' : isToday ? 'font-bold' : isRedDay && isCurrentMonth ? 'text-red-500 font-medium' : isCurrentMonth ? t.text : t.sub}`} 
                      style={{ backgroundColor: isSelected ? pointColor : 'transparent', color: (isToday && !isSelected) ? pointColor : undefined }}>
                      {format(date, 'd')}
                    </div>
                    {holiday && <div className="absolute -top-6 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">{holiday}</div>}
                    <div className="flex gap-0.5 mt-0.5 absolute bottom-0">
                      {dayEvents.slice(0, 3).map((ev, idx) => {
                        const cat = categories.find(c => c.name === ev.categoryName);
                        return <div key={idx} className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: cat?.color || '#ccc' }} />
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ================= 우측 메인 영역 ================= */}
        <section className={`flex-1 flex flex-col relative ${t.page} md:bg-transparent overflow-hidden`}>
          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-24">
            <h2 className={`text-lg font-bold mb-6 flex items-center gap-2 ${t.text}`}>
              {format(selectedDate, 'M월 d일')} 
              <span className={`font-medium text-sm ${(getHoliday(selectedDate) || selectedDate.getDay() === 0) ? 'text-red-500' : t.sub}`}>
                {format(selectedDate, 'EEEE')} {getHoliday(selectedDate) && `· ${getHoliday(selectedDate)}`}
              </span>
            </h2>
            
            <div className="space-y-6">
              {categories.map((cat) => {
                const dayEvents = events.filter(e => isSameDay(e.date, selectedDate) && e.categoryName === cat.name);
                const sortedEvents = [...dayEvents].sort((a, b) => Number(a.isDone) - Number(b.isDone));
                const isCollapsed = collapsedCats.includes(cat.name as any);

                if (dayEvents.length === 0) return null;

                return (
                  <div key={cat.id} className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2 cursor-pointer select-none w-max" onClick={() => toggleCollapse(cat.name)}>
                      <div className={`px-2.5 py-1 rounded-md text-[11px] font-bold text-white flex items-center gap-1 transition-opacity shadow-sm ${isCollapsed ? 'opacity-50' : 'opacity-100'}`} style={{ backgroundColor: cat.color }}>
                        {cat.name}
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                      </div>
                      <span className={`text-xs font-semibold ${t.sub}`}>{dayEvents.length}</span>
                    </div>

                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2 ml-1">
                          {sortedEvents.map(ev => (
                            <motion.div layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={ev.id} className={`group flex items-center gap-3 p-3.5 rounded-xl border ${t.card} ${t.border} ${ev.isDone ? 'opacity-60 bg-gray-50/50' : 'shadow-sm'}`}>
                              <div onClick={() => toggleEvent(ev.id, ev.isDone)} className="w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-colors shrink-0 cursor-pointer" style={{ backgroundColor: ev.isDone ? cat.color : 'transparent', borderColor: ev.isDone ? cat.color : '#D1D5DB' }}>
                                {ev.isDone && <Check size={12} className="text-white" />}
                              </div>
                              {/* 🔥 여기에 글자 크기(fs) 변수가 적용됩니다! */}
                              <span onClick={() => setEditingEvent(ev)} className={`${fs} font-medium flex-1 cursor-pointer hover:opacity-70 ${ev.isDone ? `${t.sub} line-through` : t.text}`}>{ev.title}</span>
                              
                              <div className="opacity-0 md:group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); quickMoveEvent(ev.id, new Date()); }} className="p-1.5 text-gray-400 hover:text-blue-500" title="오늘 하기"><CalendarDays size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); quickMoveEvent(ev.id, addDays(new Date(), 1)); }} className="p-1.5 text-gray-400 hover:text-orange-400" title="내일로 미루기"><ArrowRight size={16} /></button>
                                <button onClick={(e) => deleteEvent(ev.id, e)} className="p-1.5 text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
                              </div>
                              <button onClick={(e) => deleteEvent(ev.id, e)} className="md:hidden p-1.5 text-gray-300"><Trash2 size={16} /></button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-20">
            <button onClick={() => setIsAddModalOpen(true)} style={{ backgroundColor: pointColor }} className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"><Plus size={28} /></button>
          </div>
        </section>

        {/* ================= 설정 모달 ================= */}
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 pointer-events-none">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSettingsAndSave} className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" />
              <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className={`w-full md:w-[480px] ${t.bg} rounded-t-[32px] md:rounded-[32px] p-6 pt-4 shadow-2xl max-h-[85vh] flex flex-col pointer-events-auto relative z-10`}>
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 md:hidden" />
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-bold ${t.text}`}>앱 설정</h2>
                  <button onClick={closeSettingsAndSave} className={`p-1.5 rounded-full ${t.card} border ${t.border} ${t.sub}`}><X size={20} /></button>
                </div>
                
                <div className="space-y-8 overflow-y-auto pb-6 pr-2">
                  <div className="space-y-3">
                    <h3 className={`text-sm font-bold ml-1 ${t.sub}`}>외관 및 테마</h3>
                    <div className={`p-4 rounded-2xl ${t.card} border ${t.border} flex flex-col gap-4`}>
                      <div className={`flex p-1 rounded-xl ${t.page}`}>
                        {[ {id:'light', name:'라이트'}, {id:'dark', name:'다크'}, {id:'pastel', name:'파스텔'} ].map(mode => <button key={mode.id} onClick={() => setAppMode(mode.id as any)} className={`flex-1 py-1.5 rounded-lg text-sm font-bold ${appMode === mode.id ? `${t.card} shadow-sm${t.text}` : t.sub}`}>{mode.name}</button>)}
                      </div>
                      
                      {/* 🔥 글자 크기 설정 UI */}
                      <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <span className={`text-[15px] font-medium flex items-center gap-2 ${t.text}`}><Type size={16}/> 글자 크기</span>
                        <div className={`flex p-1 rounded-xl ${t.page}`}>
                          {[ {id:'sm', name:'작게'}, {id:'md', name:'보통'}, {id:'lg', name:'크게'} ].map(size => <button key={size.id} onClick={() => setFontSize(size.id as any)} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${fontSize === size.id ? `${t.card} shadow-sm${t.text}` : t.sub}`}>{size.name}</button>)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <span className={`text-[15px] font-medium ${t.text}`}>포인트 컬러</span>
                        <div className="relative w-8 h-8 rounded-full shadow-sm overflow-hidden border border-gray-200"><input type="color" value={pointColor} onChange={(e) => setPointColor(e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" /></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className={`text-sm font-bold ml-1 ${t.sub}`}>카테고리 관리</h3>
                    <div className={`p-4 rounded-2xl ${t.card} border ${t.border} space-y-3`}>
                      {categories.map((cat, i) => (
                        <div key={cat.id} className={`flex items-center justify-between pb-3 border-b ${t.border} last:border-0 last:pb-0`}>
                          <div className="flex items-center gap-3">
                            <div className="relative w-5 h-5 rounded-full shadow-sm border border-gray-100 overflow-hidden shrink-0"><input type="color" value={cat.color} onChange={(e) => updateCategoryColor(cat.id, e.target.value)} className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer" /></div>
                            <span className={`font-medium ${t.text}`}>{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => moveCategory(i, 'up')} className={`p-1.5 rounded-md ${t.sub} hover:${t.page}`}><ArrowUp size={16}/></button>
                            <button onClick={() => moveCategory(i, 'down')} className={`p-1.5 rounded-md ${t.sub} hover:${t.page}`}><ArrowDown size={16}/></button>
                            <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-md ml-1"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))}
                      <div className={`flex gap-2 pt-3 mt-3 border-t ${t.border}`}>
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shrink-0"><input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" /></div>
                        <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="새 카테고리 이름" className={`flex-1 bg-transparent outline-none text-[15px] ${t.text} placeholder:${t.sub}`} />
                        <button onClick={addCategory} className="px-4 py-1.5 rounded-lg text-sm font-bold text-white shadow-sm" style={{ backgroundColor: pointColor }}>추가</button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 로그아웃 버튼 */}
                  <div className="pt-4">
                    <button onClick={() => supabase.auth.signOut()} className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-red-500 bg-red-50 hover:bg-red-100 font-bold transition-colors">
                      <LogOut size={18} /> 로그아웃
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ================= 일정 추가 모달 ================= */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 pointer-events-none">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" />
              <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className={`w-full md:w-[440px] ${t.bg} rounded-t-[32px] md:rounded-[32px] p-6 pt-4 shadow-2xl flex flex-col pointer-events-auto relative z-10`}>
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 md:hidden" />
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-bold ${t.text}`}>새로운 일정</h2>
                  <button onClick={() => setIsAddModalOpen(false)} className={`p-1.5 rounded-full ${t.card} border ${t.border} ${t.sub}`}><X size={20} /></button>
                </div>
                <form onSubmit={addEvent} className="flex flex-col gap-6">
                  <div className={`${t.card} border ${t.border} rounded-2xl p-4 shadow-sm`}>
                    <input type="text" autoFocus value={inputTitle} onChange={(e) => setInputTitle(e.target.value)} placeholder="일정 제목을 입력하세요" className={`w-full text-lg bg-transparent outline-none ${t.text} placeholder:${t.sub}`} />
                  </div>
                  <div className={`${t.card} border ${t.border} rounded-2xl p-4 shadow-sm`}>
                    <p className={`text-xs font-bold mb-3 ml-1 ${t.sub}`}>어느 카테고리에 추가할까요?</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button key={cat.id} type="button" onClick={() => setSelectedCategoryName(cat.name)} className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all border ${selectedCategoryName === cat.name ? 'text-white border-transparent shadow-md' : `${t.text}${t.border}`}`} style={{ backgroundColor: selectedCategoryName === cat.name ? cat.color : 'transparent' }}>
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" style={{ backgroundColor: pointColor }} className="w-full py-4 rounded-2xl font-bold text-white text-lg active:scale-[0.98] transition-transform shadow-lg">추가하기</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ================= 일정 수정 / 이동 모달 ================= */}
        <AnimatePresence>
          {editingEvent && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 pointer-events-none">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingEvent(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" />
              <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className={`w-full md:w-[440px] ${t.bg} rounded-t-[32px] md:rounded-[32px] p-6 pt-4 shadow-2xl flex flex-col pointer-events-auto relative z-10`}>
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 md:hidden" />
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-bold ${t.text}`}>일정 수정</h2>
                  <button onClick={() => setEditingEvent(null)} className={`p-1.5 rounded-full ${t.card} border ${t.border} ${t.sub}`}><X size={20} /></button>
                </div>
                <form onSubmit={updateEvent} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2">
                    <input type="date" value={format(editingEvent.date, 'yyyy-MM-dd')} onChange={(e) => setEditingEvent({...editingEvent, date: new Date(e.target.value)})} className={`px-4 py-2.5 rounded-xl border ${t.border} ${t.bg} ${t.text} font-medium outline-none shrink-0`} />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { quickMoveEvent(editingEvent.id, new Date()); setEditingEvent(null); }} className={`px-3 py-2 rounded-xl text-[13px] font-bold bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors`}>오늘 하기</button>
                      <button type="button" onClick={() => { quickMoveEvent(editingEvent.id, addDays(new Date(), 1)); setEditingEvent(null); }} className={`px-3 py-2 rounded-xl text-[13px] font-bold bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors`}>미루기</button>
                    </div>
                  </div>
                  <div className={`${t.card} border ${t.border} rounded-2xl p-4 shadow-sm mt-2`}>
                    <input type="text" autoFocus value={editingEvent.title} onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})} placeholder="일정 제목" className={`w-full text-lg bg-transparent outline-none ${t.text} placeholder:${t.sub}`} />
                  </div>
                  <div className={`${t.card} border ${t.border} rounded-2xl p-4 shadow-sm`}>
                    <p className={`text-xs font-bold mb-3 ml-1 ${t.sub}`}>카테고리</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button key={cat.id} type="button" onClick={() => setEditingEvent({...editingEvent, categoryName: cat.name})} className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all border ${editingEvent.categoryName === cat.name ? 'text-white border-transparent shadow-md' : `${t.text}${t.border}`}`} style={{ backgroundColor: editingEvent.categoryName === cat.name ? cat.color : 'transparent' }}>
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" style={{ backgroundColor: pointColor }} className="w-full py-4 mt-2 rounded-2xl font-bold text-white text-lg active:scale-[0.98] transition-transform shadow-lg">수정 완료</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}

