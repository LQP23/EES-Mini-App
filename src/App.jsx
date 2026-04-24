import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ExternalLink, Bike, Truck, Package, Users, Briefcase, Award, ShieldCheck, ArrowRight, ChevronDown, HeartHandshake, Lock, Clock, CalendarClock, AlertCircle, PlayCircle, LogIn, LogOut, User } from 'lucide-react';

// ================================================================
// AUTH HOOK — kiểm tra session từ /api/auth/me
// ================================================================
function useAuth() {
  const [authState, setAuthState] = useState({
    loading: true,      // đang check session
    authenticated: false,
    user: null,
    error: null,
  });

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setAuthState({ loading: false, authenticated: true, user: data.user, error: null });
        } else {
          setAuthState({ loading: false, authenticated: false, user: null, error: data.reason || null });
        }
      })
      .catch(() => {
        setAuthState({ loading: false, authenticated: false, user: null, error: 'network_error' });
      });
  }, []);

  const login = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = () => {
    window.location.href = '/api/auth/logout';
  };

  return { ...authState, login, logout };
}

// ================================================================
// LOADING SCREEN
// ================================================================
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      <p className="text-gray-500 font-medium text-sm">Đang kiểm tra phiên đăng nhập...</p>
    </div>
  );
}

// ================================================================
// LOGIN SCREEN — hiển thị khi chưa đăng nhập
// ================================================================
function LoginScreen({ onLogin, ssoError }) {
  const errorMessages = {
    invalid_state: 'Phiên đăng nhập không hợp lệ. Vui lòng thử lại.',
    token_exchange_failed: 'Không thể xác thực với hệ thống. Vui lòng thử lại.',
    session_expired: 'Phiên đăng nhập đã hết hạn.',
    server_error: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    missing_params: 'Thiếu thông tin xác thực.',
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 flex flex-col items-center text-center">

        {/* Logo */}
        <div className="mb-6 p-4 bg-white rounded-2xl shadow-md border border-gray-100" style={{ width: 180 }}>
          <img
            src="https://res.cloudinary.com/dtjghirnn/image/upload/v1776218738/Logo_EES_2026-Photoroom_xblodt.png"
            alt="EES 2026"
            className="w-full h-auto"
          />
        </div>

        <h1 className="text-2xl font-extrabold text-gray-800 mb-2 tracking-tight">
          Bạn Nói, GHN Nghe 2026
        </h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Vui lòng đăng nhập bằng tài khoản GHN của bạn để tiếp tục.
        </p>

        {/* Error message */}
        {ssoError && (
          <div className="w-full bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-4 mb-6 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMessages[ssoError] || `Lỗi: ${ssoError}`}</span>
          </div>
        )}

        <button
          onClick={onLogin}
          className="w-full bg-orange-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:bg-orange-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-base"
        >
          <LogIn size={20} />
          Đăng nhập với GHN SSO
        </button>

        <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck size={14} className="text-orange-400" />
          Bảo mật bởi GHN SSO v2
        </div>
      </div>
    </div>
  );
}

// ================================================================
// MAIN APP
// ================================================================
export default function GHNEESMiniApp() {
  const { loading, authenticated, user, login, logout } = useAuth();

  // Lấy sso_error từ URL nếu có (do callback redirect về)
  const ssoError = new URLSearchParams(window.location.search).get('sso_error');

  // Xóa query param khỏi URL sau khi đọc (không reload)
  useEffect(() => {
    if (ssoError) {
      const url = new URL(window.location.href);
      url.searchParams.delete('sso_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [ssoError]);

  const [view, setView] = useState('home');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const surveySectionRef = useRef(null);
  const iframeRef = useRef(null);
  const iframeCheckTimer = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => { if (iframeCheckTimer.current) clearTimeout(iframeCheckTimer.current); };
  }, []);

  // ----------------------------------------------------------------
  // Render guards
  // ----------------------------------------------------------------
  if (loading) return <LoadingScreen />;
  if (!authenticated) return <LoginScreen onLogin={login} ssoError={ssoError} />;

  // ----------------------------------------------------------------
  // Survey config (Đã thêm +07:00 để fix lỗi timezone)
  // ----------------------------------------------------------------
  const surveyGroupsConfig = [
    {
      id: '1A',
      title: 'Nhóm 1A - NV Giao nhận',
      desc: 'NVPTTT, NVGN (GTX)',
      icon: <Bike size={24} />,
      formUrl: 'https://daotao.ghn.vn/survey/1A',
      embedUrl: '',
      startTime: '2026-04-25T00:00:00+07:00',
      endTime: '2026-05-20T00:00:00+07:00',
    },
    {
      id: '1B',
      title: 'Nhóm 1B - Tài xế vận tải',
      desc: 'Tài xế GXT & Tài Xế Xe Tải (KTC)',
      icon: <Truck size={24} />,
      formUrl: 'https://daotao.ghn.vn/survey/1B',
      embedUrl: '',
      startTime: '2026-05-12T00:00:00+07:00',
      endTime: '2026-05-20T00:00:00+07:00',
    },
    {
      id: '2A',
      title: 'Nhóm 2A - NV Vận hành Kho',
      desc: 'NVXL (Vùng), NVPH (KTC), KHL, Warehouse',
      icon: <Package size={24} />,
      formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdNquwHFPrrZ_ZzVLJN9PIwaQCSAXf0rxFCze8rYTRsbSdOUQ/viewform',
      embedUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdNquwHFPrrZ_ZzVLJN9PIwaQCSAXf0rxFCze8rYTRsbSdOUQ/viewform?embedded=true',
      startTime: '2026-05-12T00:00:00+07:00',
      endTime: '2026-05-20T00:00:00+07:00',
    },
    {
      id: '2B',
      title: 'Nhóm 2B - Quản lý Tuyến đầu',
      desc: 'AM, OM, Supervisor, TBC, Team Leaders',
      icon: <Users size={24} />,
      formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfEYvS_ENT42nPUVnCrzGL6NDjIdjJMaqoBIRmlng4XruMYMA/viewform',
      embedUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfEYvS_ENT42nPUVnCrzGL6NDjIdjJMaqoBIRmlng4XruMYMA/viewform?embedded=true',
      embedHeight: 9716,
      startTime: '2026-05-02T00:00:00+07:00',
      endTime: '2026-05-05T00:00:00+07:00',
    },
    {
      id: '3A',
      title: 'Nhóm 3A - NV Văn phòng',
      desc: 'Khối Hỗ trợ, NV gián tiếp (Indirect)',
      icon: <Briefcase size={24} />,
      formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSef_Rzp4IHUkfBKM6S5ys044twbQKThoYQEZDVoGqsDaIEtcA/viewform',
      embedUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSef_Rzp4IHUkfBKM6S5ys044twbQKThoYQEZDVoGqsDaIEtcA/viewform?embedded=true',
      embedHeight: 10108,
      startTime: '2026-05-06T00:00:00+07:00',
      endTime: '2026-05-11T00:00:00+07:00',
    },
    {
      id: '3B',
      title: 'Nhóm 3B - Quản lý HQ',
      desc: 'Manager & Director các phòng ban',
      icon: <Award size={24} />,
      formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfd-dTMyzLNXiPXom6UXPtQ2T9SsM1EVmKNsZmnNW46gXIzfg/viewform',
      embedUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfd-dTMyzLNXiPXom6UXPtQ2T9SsM1EVmKNsZmnNW46gXIzfg/viewform?embedded=true',
      embedHeight: 10164,
      startTime: '2026-05-06T00:00:00+07:00',
      endTime: '2026-05-11T00:00:00+07:00',
    },
  ];

  const surveyGroups = surveyGroupsConfig.map(group => {
    const now = currentTime.getTime();
    const start = new Date(group.startTime).getTime();
    const end = new Date(group.endTime).getTime();
    let status = 'OPEN';
    if (now < start) status = 'UPCOMING';
    else if (now > end) status = 'CLOSED';
    return { ...group, status };
  }).sort((a, b) => {
    const statusPriority = { OPEN: 1, UPCOMING: 2, CLOSED: 3 };
    if (statusPriority[a.status] !== statusPriority[b.status]) {
      return statusPriority[a.status] - statusPriority[b.status];
    }
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ngày ${day}/${month}/${year}`;
  };

  const getTimeLeftText = (group) => {
    if (group.status === 'CLOSED') return 'Đã đóng';
    const targetTime = group.status === 'UPCOMING'
      ? new Date(group.startTime).getTime()
      : new Date(group.endTime).getTime();
    const diff = targetTime - currentTime.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    if (group.status === 'UPCOMING') {
      if (days > 0) return `Mở sau ${days} ngày nữa`;
      if (hours > 0) return `Mở sau ${hours} giờ nữa`;
      return `Mở sau ${minutes} phút`;
    }
    if (days > 0) return `Còn ${days} ngày ${hours} giờ`;
    if (hours > 0) return `Còn ${hours} giờ ${minutes} phút`;
    return `Còn ${minutes} phút`;
  };

  const changeView = (newView, group = null) => {
    let targetView = newView;
    if (newView === 'info' && group) {
      if (group.status === 'CLOSED') targetView = 'closed_info';
      else if (group.status === 'UPCOMING') targetView = 'upcoming_info';
      else if (group.status === 'OPEN') targetView = 'open_info';
    }
    setIsAnimating(true);
    setIframeLoaded(false);
    setIframeError(false);
    setTimeout(() => {
      if (group) setSelectedGroup(group);
      setView(targetView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsAnimating(false);
    }, 200);
  };

  const handleStartSurvey = () => {
    if (!selectedGroup) return;
    if (selectedGroup.id === '1A' || selectedGroup.id === '1B') {
      window.location.href = selectedGroup.formUrl;
      return;
    }
    if (selectedGroup.embedUrl) {
      changeView('embed', selectedGroup);
    } else {
      window.open(selectedGroup.formUrl, '_blank');
    }
  };

  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
    if (iframeCheckTimer.current) clearTimeout(iframeCheckTimer.current);
    iframeCheckTimer.current = setTimeout(() => {
      try {
        const iframe = iframeRef.current;
        if (iframe) {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc && iframeDoc.body && iframeDoc.body.innerHTML === '') {
            setIframeError(true);
          }
        }
      } catch {
        // CORS = iframe loaded OK
      }
    }, 6000); // Tăng lên 6s chờ Iframe theo góp ý
  }, []);

  const handleOpenFormInPlace = () => {
    if (selectedGroup?.formUrl) window.location.href = selectedGroup.formUrl;
  };

  const scrollToSurveys = () => {
    if (surveySectionRef.current) {
      surveySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const Header = ({ title, showBack = true, onBack }) => (
    <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 h-14 flex items-center justify-center shadow-sm w-full transition-all">
      <div className="w-full max-w-[1200px] flex items-center px-4 lg:px-8">
        <div className="w-10 flex justify-start shrink-0">
          {showBack && (
            <button onClick={onBack} className="p-2 -ml-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all duration-200">
              <ChevronLeft size={24} />
            </button>
          )}
        </div>
        <h1 className="flex-1 text-[17px] font-bold text-gray-800 truncate px-2 tracking-tight text-center">{title}</h1>
        <div className="w-10 shrink-0 flex justify-end">
          <button
            onClick={logout}
            title={`${user?.name || 'User'} — Đăng xuất`}
            className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors"
          >
            <User size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col font-sans w-full transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>

      {view === 'home' && (
        <>
          <Header title="BẠN NÓI, GHN NGHE 2026" showBack={false} />
          <div className="flex-1 overflow-y-auto w-full pb-16">
            <div className="max-w-[1200px] mx-auto w-full">

              <div className="text-white px-6 pt-8 pb-16 md:px-14 md:pt-10 md:pb-24 rounded-b-[2.5rem] md:rounded-b-[4rem] shadow-lg relative overflow-hidden mx-auto flex flex-col items-center text-center" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 40%, #c2410c 100%)' }}>
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />

                <div className="relative z-10 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-white/15 backdrop-blur-sm border border-white/20 text-white/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Khảo sát đang diễn ra • 2026
                  </span>
                </div>

                <div className="relative z-10 mb-5 flex flex-col items-center w-full" style={{ maxWidth: '340px' }}>
                  <div className="hover:scale-[1.03] transition-transform duration-300 w-full" style={{ background: 'rgba(255,255,255,0.97)', borderRadius: '20px', padding: '16px 20px', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>
                    <img src="https://res.cloudinary.com/dtjghirnn/image/upload/v1776218738/Logo_EES_2026-Photoroom_xblodt.png" alt="Logo EES 2026" className="w-full h-auto object-contain" />
                  </div>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-3 md:mb-5 relative z-10 leading-tight tracking-tight drop-shadow-sm">
                  BẠN NÓI
                  <br />
                  <span className="text-orange-100">GHN NGHE</span>
                </h1>

                {user?.name && (
                  <p className="relative z-10 text-white/80 text-sm font-medium mb-3 bg-white/10 px-4 py-1.5 rounded-full">
                    Xin chào, <strong className="text-white">{user.name}</strong> 👋
                  </p>
                )}

                <p className="text-orange-50 font-medium text-sm md:text-lg relative z-10 max-w-2xl opacity-95 leading-relaxed mb-5">
                  Tiếng nói của bạn là chìa khóa để chúng ta cùng nhau xây dựng một môi trường làm việc tuyệt vời hơn.
                  <br className="mt-2 block" />
                  <span className="italic text-white/90">"Mỗi ý kiến • Một bước tiến cho GHN"</span>
                </p>

                <div className="relative z-10 flex flex-wrap justify-center gap-2 md:gap-3">
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/90">
                    <ShieldCheck size={14} /> Bảo mật 100%
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/90">
                    <Lock size={14} /> Ẩn danh
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/90">
                    <Clock size={14} /> ~10 phút
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-8 -mt-10 md:-mt-16 relative z-20">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-6 max-w-3xl mx-auto text-center ring-1 ring-black/5">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-2">
                    Thư ngỏ gửi bạn <HeartHandshake className="text-orange-500" size={26} />
                  </h2>
                  <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                    Chào bạn, đây là chương trình khảo sát định kỳ nhằm lắng nghe những tâm tư và nguyện vọng của bạn. Hãy an tâm chia sẻ những suy nghĩ chân thật nhất nhé, vì mọi ý kiến đều được công ty trân trọng và cam kết <strong className="text-orange-600 font-bold">bảo mật danh tính 100%</strong>.
                  </p>
                </div>

                <div className="flex justify-center mb-8 mt-4">
                  <button onClick={scrollToSurveys} className="bg-white p-2.5 rounded-full shadow-md text-orange-500 animate-bounce ring-1 ring-black/5 hover:bg-orange-50 transition-colors cursor-pointer active:scale-95">
                    <ChevronDown size={24} strokeWidth={3} />
                  </button>
                </div>

                <div ref={surveySectionRef} className="mb-6 flex flex-col items-center text-center scroll-mt-24">
                  <h3 className="font-extrabold text-gray-800 text-xl md:text-2xl mb-2">Bắt đầu khảo sát</h3>
                  <p className="text-sm md:text-base text-gray-500 max-w-lg">
                    Vui lòng chọn đúng <strong className="text-orange-600">NHÓM vị trí công việc hiện tại</strong> của bạn <br /> ở bên dưới:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
                  {surveyGroups.map((group) => {
                    const isClosed = group.status === 'CLOSED';
                    const isUpcoming = group.status === 'UPCOMING';
                    const isOpen = group.status === 'OPEN';
                    return (
                      <div key={group.id} className={`group bg-white p-5 md:p-6 rounded-3xl shadow-sm border flex flex-col h-full relative overflow-hidden transition-all duration-300
                        ${isClosed ? 'border-gray-200 bg-gray-50/50 hover:shadow-md' : ''}
                        ${isUpcoming ? 'border-blue-100 bg-blue-50/20 hover:border-blue-300 hover:shadow-md' : ''}
                        ${isOpen ? 'border-gray-100 hover:border-orange-300 hover:shadow-xl hover:-translate-y-1' : ''}
                      `}>
                        {isOpen && <div className="absolute inset-0 bg-gradient-to-br from-orange-50/0 to-orange-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />}
                        <div className="flex items-start gap-4 relative z-10 w-full mb-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-colors duration-300
                            ${isClosed ? 'bg-gray-200 text-gray-400' : ''}
                            ${isUpcoming ? 'bg-blue-100 text-blue-500' : ''}
                            ${isOpen ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white' : ''}
                          `}>
                            {group.icon}
                          </div>
                          <div className="flex-1 pt-1">
                            <h4 className={`font-bold text-base mb-1 ${isClosed ? 'text-gray-500' : 'text-gray-800'}`}>{group.title}</h4>
                            <p className="text-sm text-gray-500 leading-snug line-clamp-2">{group.desc}</p>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 mt-2 rounded-md text-xs font-semibold w-fit border
                              ${isOpen ? 'bg-orange-50 text-orange-600 border-orange-100' : ''}
                              ${isUpcoming ? 'bg-blue-50 text-blue-600 border-blue-100' : ''}
                              ${isClosed ? 'bg-gray-100 text-gray-500 border-gray-200' : ''}
                            `}>
                              {isOpen && <Clock size={13} className="animate-pulse" />}
                              {isUpcoming && <CalendarClock size={13} />}
                              {isClosed && <Lock size={13} />}
                              {getTimeLeftText(group)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-auto relative z-10">
                          <button
                            onClick={() => changeView('info', group)}
                            className={`w-full py-3.5 rounded-xl font-semibold text-sm md:text-base flex items-center justify-center gap-2 transition-all duration-300 active:scale-95
                              ${isClosed ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : ''}
                              ${isUpcoming ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''}
                              ${isOpen ? 'bg-gray-50 text-gray-700 group-hover:bg-orange-500 group-hover:text-white' : ''}
                            `}
                          >
                            {isClosed && <>Xem thông báo <ArrowRight size={18} /></>}
                            {isUpcoming && <>Xem thông tin <ArrowRight size={18} /></>}
                            {isOpen && <>Thông tin khảo sát <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center mt-12">
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors py-2 px-4 rounded-lg hover:bg-red-50"
                  >
                    <LogOut size={15} /> Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'open_info' && selectedGroup?.status === 'OPEN' && (
        <>
          <Header title="Chuẩn bị khảo sát" onBack={() => changeView('home')} />
          <div className="flex-1 flex flex-col p-4 md:p-8 w-full justify-center pb-20">
            <div className="w-full max-w-[600px] mx-auto bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 md:p-12 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-orange-50/50 to-transparent pointer-events-none" />
              <div className="relative mb-8 mt-4 z-10">
                <div className="absolute inset-0 bg-orange-500 rounded-full opacity-20 animate-ping" />
                <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/40 border-4 border-white">
                  {React.cloneElement(selectedGroup?.icon, { size: 48, strokeWidth: 1.5 })}
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-3 tracking-tight z-10">{selectedGroup?.title}</h2>
              <p className="text-base md:text-lg text-gray-600 mb-8 font-medium bg-gray-100 py-2 px-6 rounded-full inline-block z-10">{selectedGroup?.desc}</p>
              <div className="w-full bg-orange-50/80 border border-orange-100 text-orange-800 text-sm md:text-base p-6 md:p-8 rounded-2xl flex flex-col items-center gap-3 mb-10 z-10">
                <PlayCircle size={32} className="text-orange-500 mb-2 drop-shadow-sm" />
                <p className="leading-relaxed text-center font-medium">
                  Khảo sát đang được mở. Bạn hãy dành khoảng <strong className="text-orange-600">10 phút</strong> để hoàn thành nhé. Hệ thống sẽ tự động đóng vào:
                </p>
                <div className="bg-white px-5 py-2.5 rounded-xl font-bold text-orange-700 shadow-sm border border-orange-100 text-lg">
                  {formatDateTime(selectedGroup.endTime)}
                </div>
                <div className="flex items-center gap-2 mt-3 text-orange-600/80 text-sm">
                  <ShieldCheck size={16} /> Cam kết ẩn danh
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full z-10">
                <button onClick={handleStartSurvey} className="w-full sm:flex-1 bg-orange-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:bg-orange-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-base md:text-lg">
                  Bắt đầu làm bài <ExternalLink size={22} />
                </button>
                <button onClick={() => changeView('home')} className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-white border-2 border-gray-100 text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-[0.98] text-base md:text-lg">
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'embed' && selectedGroup?.status === 'OPEN' && selectedGroup?.embedUrl && (
        <>
          <Header title={selectedGroup.title} onBack={() => changeView('open_info', selectedGroup)} />
          <div className="flex flex-col w-full" style={{ height: 'calc(100vh - 56px)' }}>
            <div className="bg-orange-50 border-b border-orange-100 px-4 py-2.5 flex justify-between items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck size={16} className="text-orange-500 shrink-0" />
                <p className="text-xs text-orange-700 font-medium truncate">Kết quả được ghi nhận <strong>ẩn danh</strong> hoàn toàn.</p>
              </div>
              <a href={selectedGroup?.formUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-orange-600 bg-white border border-orange-200 px-3 py-1.5 rounded-full shadow-sm hover:bg-orange-100 flex items-center gap-1 shrink-0 active:scale-95 transition-all no-underline">
                Mở tab mới <ExternalLink size={12} />
              </a>
            </div>
            {!iframeLoaded && !iframeError && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Đang tải biểu mẫu...</p>
              </div>
            )}
            {iframeError && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                    <AlertCircle size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Không thể nhúng biểu mẫu</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">Trình duyệt hiện tại không hỗ trợ hiển thị Google Form nhúng. Vui lòng mở bằng một trong các cách bên dưới:</p>
                  <div className="flex flex-col gap-3 w-full">
                    <button onClick={handleOpenFormInPlace} className="w-full bg-orange-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-md hover:bg-orange-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                      Mở ngay tại đây <ArrowRight size={18} />
                    </button>
                    <a href={selectedGroup?.formUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-white border-2 border-gray-200 text-gray-700 font-bold py-3.5 px-6 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98] no-underline">
                      Mở bằng trình duyệt <ExternalLink size={18} />
                    </a>
                  </div>
                </div>
              </div>
            )}
            {!iframeError && (
              <div className="flex-1 w-full overflow-hidden" style={{ position: 'relative' }}>
                <iframe
                  ref={iframeRef}
                  src={selectedGroup.embedUrl}
                  width="100%" height="100%"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
                  allow="clipboard-write; clipboard-read"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="border-none"
                  frameBorder="0" marginHeight="0" marginWidth="0"
                  onLoad={handleIframeLoad}
                  style={{ display: iframeLoaded ? 'block' : 'none', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  title={`Khảo sát ${selectedGroup.title}`}
                >Đang tải…</iframe>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'closed_info' && selectedGroup?.status === 'CLOSED' && (
        <>
          <Header title="Khảo sát đã đóng" onBack={() => changeView('home')} />
          <div className="flex-1 flex flex-col p-4 md:p-8 w-full justify-center pb-20">
            <div className="w-full max-w-[600px] mx-auto bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 md:p-12 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shadow-inner border-4 border-white mb-6 mt-4 z-10">
                <Lock size={40} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-3 tracking-tight z-10">{selectedGroup?.title}</h2>
              <div className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm md:text-base p-6 md:p-8 rounded-2xl flex flex-col items-center gap-3 mb-10 z-10">
                <AlertCircle size={32} className="text-gray-400 mb-2" />
                <p className="leading-relaxed text-center font-medium">Khảo sát này đã chính thức khép lại vào lúc:</p>
                <div className="bg-white px-5 py-2.5 rounded-xl font-bold text-gray-800 shadow-sm border border-gray-100 text-lg">{formatDateTime(selectedGroup.endTime)}</div>
                <p className="text-gray-500 mt-2 text-sm">Cảm ơn bạn đã quan tâm. Hẹn gặp lại ở những khảo sát lần sau!</p>
              </div>
              <button onClick={() => changeView('home')} className="w-full py-4 px-8 rounded-2xl bg-gray-800 text-white font-bold hover:bg-gray-900 transition-all active:scale-[0.98] text-base md:text-lg z-10">
                Quay lại trang chủ
              </button>
            </div>
          </div>
        </>
      )}

      {view === 'upcoming_info' && selectedGroup?.status === 'UPCOMING' && (
        <>
          <Header title="Khảo sát sắp mở" onBack={() => changeView('home')} />
          <div className="flex-1 flex flex-col p-4 md:p-8 w-full justify-center pb-20">
            <div className="w-full max-w-[600px] mx-auto bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8 md:p-12 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shadow-inner border-4 border-white mb-6 mt-4 z-10">
                <CalendarClock size={40} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-3 tracking-tight z-10">{selectedGroup?.title}</h2>
              <div className="w-full bg-blue-50/80 border border-blue-100 text-blue-800 text-sm md:text-base p-6 md:p-8 rounded-2xl flex flex-col items-center gap-3 mb-10 z-10">
                <p className="leading-relaxed text-center font-medium">Khảo sát chưa được bắt đầu. Hệ thống sẽ tự động mở vào lúc:</p>
                <div className="bg-white px-5 py-2.5 rounded-xl font-bold text-blue-700 shadow-sm border border-blue-100 text-lg">{formatDateTime(selectedGroup.startTime)}</div>
                <p className="text-blue-600/80 mt-2 text-sm">Bạn vui lòng hãy quay lại vào thời gian mở khảo sát nhé!</p>
              </div>
              <button onClick={() => changeView('home')} className="w-full py-4 px-8 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all active:scale-[0.98] text-base md:text-lg z-10">
                Đã hiểu & Quay lại
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}