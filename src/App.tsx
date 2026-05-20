/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, FormEvent, createContext, useContext } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Menu, 
  ChevronsDown, 
  Plane, 
  Droplets, 
  Flame, 
  ArrowRight, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  Globe,
  Wheat,
  X,
  Wind,
  Thermometer,
  AlertTriangle,
  Compass,
  Info,
  ShieldCheck,
  HelpCircle,
  Search,
  Award,
  Users,
  CreditCard,
  Send,
  Bot,
  MessageSquare,
  Sparkles,
  ChevronDown
} from 'lucide-react';

// --- Weather Context ---
interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  windDir: number;
  wetBulb: number;
  deltaT: number;
  evapLoss: number;
  status: { label: string; color: string; desc: string; scale: string };
  dropCat: { label: string; color: string; desc: string };
  adjuvant: string;
  volume: string;
  cityName: string;
}

interface ForecastDay {
  day: string;
  temp: number;
  humidity: number;
  windSpeed: number;
  windDir: number;
  deltaT: number;
  evapLoss: number;
  wetBulb: number;
  flightStatus: string;
  recommendation: string;
}

interface LocationForecast {
  name: string;
  lat: number;
  lon: number;
  region: string;
  current: WeatherData;
  forecast: ForecastDay[];
}

const WeatherContext = createContext<WeatherData | null>(null);
const ForecastContext = createContext<LocationForecast[]>([]);
const useWeather = () => useContext(WeatherContext);
const useForecasts = () => useContext(ForecastContext);

// --- Location data with seasonal patterns for NOA region ---
const locationProfiles: Omit<LocationForecast, 'current' | 'forecast'>[] = [
  { name: "Las Lajitas", region: "Salta", lat: -25.07, lon: -64.25 },
  { name: "Joaquín V. González", region: "Salta", lat: -25.08, lon: -64.18 },
  { name: "Metán", region: "Salta", lat: -25.49, lon: -64.97 },
  { name: "Tucumán", region: "Tucumán", lat: -26.82, lon: -65.22 },
  { name: "Charata", region: "Chaco", lat: -27.21, lon: -61.18 },
  { name: "Pergamino", region: "Buenos Aires", lat: -33.89, lon: -60.57 },
];

// Generate realistic forecast based on location profiles and seasonal patterns
const generateForecasts = (currentWeather: WeatherData): LocationForecast[] => {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const isSummer = month >= 10 || month <= 1; // Nov-Feb
  const isWinter = month >= 5 && month <= 7; // Jun-Aug

  return locationProfiles.map((loc) => {
    // Base conditions per region
    const baseTemp = loc.region === 'Buenos Aires' ? (isWinter ? 12 : 28) : isSummer ? 32 : 22;
    const baseHumidity = loc.region === 'Chaco' ? 70 : loc.region === 'Buenos Aires' ? 65 : 55;
    const baseWind = loc.region === 'Chaco' ? 12 : 8;

    // Generate 5-day forecast with realistic variation
    const forecast: ForecastDay[] = [];
    const dayNames = ['Hoy', 'Mañana', 'Pasado mañana', 'En 3 días', 'En 4 días'];

    for (let i = 0; i < 5; i++) {
      // Add daily variation
      const tempVar = Math.round((Math.random() - 0.5) * 6);
      const humVar = Math.round((Math.random() - 0.5) * 20);
      const windVar = Math.round((Math.random() - 0.5) * 8);
      const dirVar = Math.round((Math.random() - 0.5) * 40);

      const temp = Math.max(8, Math.min(42, baseTemp + tempVar + (i * 0.5)));
      const humidity = Math.max(20, Math.min(95, baseHumidity + humVar));
      const windSpeed = Math.max(0, Math.min(25, baseWind + windVar));
      const windDir = Math.round(((baseTemp + dirVar + i * 30) % 360 + 360) % 360);

      // Calculate Delta T (simplified)
      const wetBulb = temp * Math.atan(0.151977 * Math.sqrt(humidity + 8.313659)) +
        Math.atan(temp + humidity) -
        Math.atan(humidity - 1.676331) +
        0.00391838 * Math.pow(humidity, 1.5) * Math.atan(0.023101 * humidity) -
        4.686035;
      const deltaT = Math.round((temp - Math.max(0, wetBulb)) * 10) / 10;
      const evapLoss = deltaT > 8 ? Math.min(30 + Math.round((temp - 30) * 1.5), 55) : deltaT < 2 ? 3 : Math.round(deltaT * 2.2);

      // Determine flight status
      let flightStatus: string;
      let recommendation: string;

      if (windSpeed < 3) {
        flightStatus = "⛔ No volar - Inversión térmica";
        recommendation = "Viento muy bajo. Esperar a que suba de 3 km/h.";
      } else if (windSpeed > 15) {
        flightStatus = "⛔ No volar - Viento excesivo";
        recommendation = "Viento supera 15 km/h. Suspender operaciones.";
      } else if (deltaT > 8) {
        flightStatus = "⚠️ Precaución - Delta T alto";
        recommendation = "Usar MSO + antievaporante. Gotas >350µm. Volumen 8-10 L/ha.";
      } else if (deltaT < 2) {
        flightStatus = "⚠️ Precaución - Delta T bajo";
        recommendation = "Riesgo de coalescencia. Usar antideriva obligatoriamente.";
      } else {
        flightStatus = "✅ Óptimo para volar";
        recommendation = "Condiciones ideales. Aplicación estándar recomendada.";
      }

      forecast.push({
        day: dayNames[i],
        temp: Math.round(temp),
        humidity: Math.round(humidity),
        windSpeed: Math.round(windSpeed * 10) / 10,
        windDir,
        deltaT: Math.round(deltaT * 10) / 10,
        evapLoss,
        wetBulb: Math.round(Math.max(0, wetBulb) * 10) / 10,
        flightStatus,
        recommendation,
      });
    }

    // Current weather for this location (slightly varied from main dashboard)
    const currentTemp = Math.round(baseTemp + (Math.random() - 0.5) * 4);
    const currentHumidity = Math.round(baseHumidity + (Math.random() - 0.5) * 15);
    const currentWind = Math.round((baseWind + (Math.random() - 0.5) * 5) * 10) / 10;
    const currentDir = Math.round(((baseTemp + (Math.random() - 0.5) * 60) % 360 + 360) % 360);
    const currentWetBulb = currentTemp * Math.atan(0.151977 * Math.sqrt(currentHumidity + 8.313659)) +
      Math.atan(currentTemp + currentHumidity) -
      Math.atan(currentHumidity - 1.676331) +
      0.00391838 * Math.pow(currentHumidity, 1.5) * Math.atan(0.023101 * currentHumidity) -
      4.686035;
    const currentDeltaT = Math.round((currentTemp - Math.max(0, currentWetBulb)) * 10) / 10;
    const currentEvap = currentDeltaT > 8 ? Math.min(30 + Math.round((currentTemp - 30) * 1.5), 55) : currentDeltaT < 2 ? 3 : Math.round(currentDeltaT * 2.2);

    let currentStatus: string;
    if (currentWind < 3) currentStatus = "⛔ Inversión térmica";
    else if (currentWind > 15) currentStatus = "⛔ Viento excesivo";
    else if (currentDeltaT > 8) currentStatus = "⚠️ Delta T alto";
    else if (currentDeltaT < 2) currentStatus = "⚠️ Delta T bajo";
    else currentStatus = "✅ Óptimo";

    return {
      ...loc,
      current: {
        temp: currentTemp,
        humidity: currentHumidity,
        windSpeed: currentWind,
        windDir: currentDir,
        wetBulb: Math.round(Math.max(0, currentWetBulb) * 10) / 10,
        deltaT: currentDeltaT,
        evapLoss: currentEvap,
        status: { label: currentStatus, color: currentStatus.includes('Óptimo') ? 'green' : currentStatus.includes('⛔') ? 'red' : 'amber', desc: '', scale: '' },
        dropCat: { label: '', color: '', desc: '' },
        adjuvant: '',
        volume: '',
        cityName: loc.name,
      },
      forecast,
    };
  });
};

// --- Components ---

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-surface-base/90 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-5'
      } border-b border-outline-variant/10`}
    >
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer group">
          <img 
            src="/logo-aerosoluciones.jpg" 
            alt="Aerosoluciones" 
            className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex gap-8 items-center text-sm font-semibold tracking-wide uppercase">
          <a href="#servicios" className="text-white hover:text-secondary-container transition-colors border-b-2 border-secondary-container pb-1">Servicios</a>
          <a href="#flota" className="text-on-surface-variant hover:text-white transition-colors">Flota</a>
          <a href="#operaciones" className="text-on-surface-variant hover:text-white transition-colors">Operaciones</a>
          <a href="#contacto" className="text-on-surface-variant hover:text-white transition-colors">Contacto</a>
          <button className="bg-secondary-container text-on-secondary-container px-6 py-2.5 rounded-sm active:scale-95 transition-all hover:brightness-110 shadow-lg shadow-secondary-container/10">
            Cotizar Servicio
          </button>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-surface-container-high border-b border-outline-variant/20 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4 font-semibold uppercase text-sm">
              <a href="#servicios" onClick={() => setMobileMenuOpen(false)} className="text-secondary-container">Servicios</a>
              <a href="#flota" onClick={() => setMobileMenuOpen(false)} className="text-on-surface">Flota</a>
              <a href="#operaciones" onClick={() => setMobileMenuOpen(false)} className="text-on-surface">Operaciones</a>
              <a href="#contacto" onClick={() => setMobileMenuOpen(false)} className="text-on-surface">Contacto</a>
              <button className="bg-secondary-container text-on-secondary-container px-6 py-3 rounded-sm shadow-md">
                Cotizar Servicio
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 500], [1, 1.15]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout>;
    
    const handleScroll = () => {
      setIsScrolling(true);
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      }, 150);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <header className="relative h-screen w-full flex items-center overflow-hidden bg-surface-base">
      <motion.div 
        style={{ y, scale }}
        className="absolute inset-0 z-0 h-full w-full"
      >
        <video
          ref={videoRef}
          src="/airtaractorlvcuh.mp4"
          className="w-full h-full object-cover brightness-[0.6] contrast-[1.05]"
          muted
          playsInline
          loop
          preload="auto"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-surface-base via-surface-base/50 to-transparent z-10" />
      
      {/* Capas de nubes parallax */}
      {[0.1, 0.25, 0.4, 0.6].map((speed, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            z: i + 5,
          }}
        >
          <motion.div
            className="absolute text-white/20"
            style={{
              y: useTransform(scrollY, [0, 1000], [0, 200 * speed]),
              x: useTransform(scrollY, [0, 500], [i * 50, i * 50 + 100]),
            }}
          >
            {/* Nubes simulated con caracteres */}
            <div 
              className={`absolute rounded-full blur-xl ${i === 0 ? 'w-96 h-32 top-[20%] left-[10%]' : i === 1 ? 'w-64 h-20 top-[40%] left-[60%]' : i === 2 ? 'w-80 h-28 top-[60%] left-[30%]' : 'w-56 h-16 top-[30%] left-[80%]'}`}
              style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.15) 0%, transparent 70%)' }}
            />
            <div 
              className={`absolute rounded-full blur-xl ${i === 0 ? 'w-72 h-24 top-[50%] left-[70%]' : i === 1 ? 'w-48 h-16 top-[15%] left-[20%]' : i === 2 ? 'w-64 h-20 top-[70%] left-[50%]' : 'w-40 h-14 top-[55%] left-[10%]'}`}
              style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.1) 0%, transparent 70%)' }}
            />
          </motion.div>
        </motion.div>
      ))}
      
      <div className="relative z-20 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
        <motion.div 
          style={{ opacity }}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
            Excelencia en <br />
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-secondary-container"
            >
              Ingeniería Aeroagrícola
            </motion.span>
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl mb-10 max-w-xl leading-relaxed">
            Precisión milimétrica desde el aire para optimizar los campos del futuro. 
            Aplicaciones certificadas con la flota más avanzada del sector.
          </p>
        </motion.div>
      </div>

      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-60"
      >
        <span className="text-xs uppercase tracking-widest font-bold">Deslizar</span>
        <ChevronsDown className="text-secondary-container w-6 h-6" />
      </motion.div>
    </header>
  );
};

const ParallaxSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);

  return (
    <section ref={containerRef} className="relative h-[65vh] w-full overflow-hidden flex items-center justify-center">
      <motion.div 
        style={{ y }}
        className="absolute inset-0 z-0 h-[130%] -top-[15%] w-full"
      >
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat filter brightness-[0.7] contrast-[1.05]"
          style={{ 
            backgroundImage: "url('/soja.jpg')",
          }}
        />
      </motion.div>
      <div className="absolute inset-0 bg-surface-base/40 backdrop-blur-[1px] z-10" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative z-20 text-center px-6"
      >
        <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-4 tracking-tighter drop-shadow-2xl">
          Resultados de <span className="text-secondary-container">Éxito</span>
        </h2>
        <p className="text-white/90 text-lg uppercase tracking-[0.4em] font-medium">Cosechas que Hablan</p>
      </motion.div>
    </section>
  );
};


const ServiceCard = ({ icon: Icon, title, description, delay = 0 }: { icon: any, title: string, description: string, delay?: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
    className="bg-surface-container p-10 group rounded-2xl border border-outline-variant/10 transition-all duration-300 hover:border-secondary-container/50 hover:shadow-2xl hover:shadow-secondary-container/5"
  >
    <div className="mb-8 w-16 h-16 bg-primary-container text-secondary-container rounded-sm flex items-center justify-center transition-transform duration-500 group-hover:bg-secondary-container group-hover:text-on-secondary-container group-hover:-rotate-6">
      <Icon className="w-8 h-8" />
    </div>
    <h3 className="font-display text-2xl font-bold text-white mb-4 tracking-tight">{title}</h3>
    <p className="text-on-surface-variant mb-8 leading-relaxed">{description}</p>
    <a href="#" className="inline-flex items-center gap-2 text-secondary-container font-bold text-sm tracking-widest uppercase hover:gap-4 transition-all">
      Ver Más <ArrowRight className="w-4 h-4" />
    </a>
  </motion.div>
);

const Services = () => (
  <section id="servicios" className="py-32 bg-surface-base relative overflow-hidden">
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={{
          visible: { transition: { staggerChildren: 0.15 } }
        }}
        className="flex flex-col gap-20"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, x: -30 },
            visible: { opacity: 1, x: 0 }
          }}
          className="max-w-2xl"
        >
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-6 tracking-tighter">Servicios de Alta Precisión</h2>
          <div className="w-24 h-1.5 bg-secondary-container mb-8" />
          <p className="text-on-surface-variant text-xl leading-relaxed">
            Utilizamos sistemas de navegación DGPS y tecnología de atomización variable 
            para garantizar resultados excepcionales en cada hectárea.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Plane, title: "Pulverización Aérea", desc: "Aplicación precisa de fitosanitarios con tecnología Air Tractor." },
            { icon: Wheat, title: "Siembra Directa", desc: "Distribución eficiente de semillas optimizando tiempos de campaña." },
            { icon: Droplets, title: "Fertilización Líquida", desc: "Nutrición óptima con dosificación variable y cobertura uniforme." },
            { icon: Flame, title: "Control de Incendios", desc: "Respuesta rápida con aeronaves especializadas en combate rural." }
          ].map((item, i) => (
            <motion.div 
              key={i}
              variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
              }}
              className="bg-surface-container/40 p-10 group hover:bg-surface-container transition-all duration-500 rounded-lg hover:shadow-2xl"
            >
              <div className="mb-8 w-14 h-14 bg-primary-container text-secondary-container rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-secondary-container group-hover:text-on-secondary-container">
                <item.icon className="w-7 h-7" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-4 tracking-tight">{item.title}</h3>
              <p className="text-on-surface-variant mb-8 leading-relaxed">{item.desc}</p>
              <a href="#" className="inline-flex items-center gap-2 text-secondary-container font-bold text-sm tracking-widest uppercase hover:gap-4 transition-all">
                Ver Más <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

const ParallaxTransition = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["30%", "-30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return (
    <section ref={containerRef} className="relative h-[50vh] overflow-hidden flex items-center justify-center">
      <motion.div 
        style={{ y }}
        className="absolute inset-0 z-0"
      >
        <div 
          className="w-full h-[140%] -top-[20%] bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: "url('/avioneta_fumigacion.jpg')",
          }}
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-surface-base/30 via-surface-base/60 to-surface-base z-10" />
      <motion.div 
        style={{ y: textY, opacity }}
        className="relative z-20 text-center px-6 max-w-4xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="text-secondary-container text-xs font-bold uppercase tracking-[0.3em] mb-4 block">
            Compromiso con la Excelencia
          </span>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Más de <span className="text-secondary-container">20 años</span> de experiencia
          </h2>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Volando sobre los campos del norte argentino con tecnología de punta y pasión por el agro.
          </p>
          <div className="flex justify-center gap-8 mt-10">
            {[
              { value: "20+", label: "Años" },
              { value: "50K", label: "Hectáreas" },
              { value: "100%", label: "Seguridad" }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-black text-secondary-container">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

const FleetHighlight = () => {
  const [activeHotspot, setActiveHotspot] = useState<'motor' | 'tolva' | 'guiado' | 'aspersores'>('motor');
  const [activeSpecTab, setActiveSpecTab] = useState<'tecnicas' | 'dimensiones'>('tecnicas');

  const hotspots = {
    motor: {
      title: "Turbina Pratt & Whitney PT6A-67AG",
      desc: "La central de potencia legendaria del AT-802A. Sus 1,350 caballos de fuerza de turbina garantizan una despegue seguro con carga máxima de pulverización y asombroso control de maniobra aún bajo el calor abrasador del NOA argentino (Salta, Anta, Chaco).",
      stats: [
        { label: "Potencia Nominal", value: "1,350 Shp" },
        { label: "Tipo de Combustible", value: "Jet A-1 / JP-8" },
        { label: "Palas de Hélice", value: "Hartzell 5-Blade Constant Speed" }
      ]
    },
    tolva: {
      title: "Tolva de Alta Producción (3,028 Litros / 800 Gal)",
      desc: "La tolva de agroaplicación más grande del mundo para un avión monomotor. Multiplica el rendimiento de la campaña permitiendo cubrir amplias extensiones en una sola salida y minimizando tiempos muertos en pista.",
      stats: [
        { label: "Capacidad Líquida", value: "3,028 Litros" },
        { label: "Carga Útil en Tolva", value: "4,286 Kg (9,450 Lbs)" },
        { label: "Compuerta de Descarga", value: "Apertura Rápida Neumática" }
      ]
    },
    guiado: {
      title: "Mapeo Satelital DGPS Satloc G4",
      desc: "Guiado y dosificación satelital submétrica de máxima exactitud. Los flujos de aplicación aérea se conectan automáticamente al caudalímetro inteligente, cerrando válvulas en cabeceras para eliminar superposiciones.",
      stats: [
        { label: "Margen de Error", value: "< 0.5 Metros" },
        { label: "Mapeo del Área", value: "Polígonos Automáticos KML/SIG" },
        { label: "Control de Caudal", value: "Variable por Velocidad de Vuelo" }
      ]
    },
    aspersores: {
      title: "Botalón Hidráulico con Boquillas de Deriva Controlada",
      desc: "Atomizadores ajustables de precisión CP Nozzles. Posibilitan regular micrométricamente el diámetro volumétrico medio de la gota. Impide derivas accidentales y asegura que el fitosanitario llege al estrato inferior del cultivo.",
      stats: [
        { label: "Boquillas Activas", value: "CP-11 de Caudal Variable" },
        { label: "Control Estático", value: "Deflector de Ángulo Variable" },
        { label: "Presión Óptima", value: "30 - 45 PSI Constante" }
      ]
    }
  };

  const specs = {
    tecnicas: [
      { param: "Motor Estándar", value: "Pratt & Whitney PT6A-67AG" },
      { param: "Potencia del Motor", value: "1,350 Caballo de Fuerza (SHP)" },
      { param: "Hélice de Combate", value: "Hartzell de 5 palas de aluminio, velocidad constante" },
      { param: "Velocidad de Trabajo", value: "241 Km/h (150 Mph)" },
      { param: "Carga Útil Certificada", value: "4,286 Kg (9,450 Lbs)" },
      { param: "Capacidad de la Tolva", value: "3,028 Litros (800 Galones)" },
      { param: "Capacidad de Combustible", value: "961 Litros (254 Galones)" }
    ],
    dimensiones: [
      { param: "Envergadura (Alas)", value: "18.04 Metros (59.3 Pies)" },
      { param: "Longitud Total", value: "11.07 Metros (36.3 Pies)" },
      { param: "Altura de Estructura", value: "3.57 Metros (11.7 Pies)" },
      { param: "Capa de Ala Activa", value: "37.2 M² de perfil de alta sustentación" },
      { param: "Peso Vacío", value: "2,971 Kg (6,550 Lbs)" },
      { param: "Peso Máximo de Despegue", value: "7,257 Kg (16,000 Lbs) (Área Ag)" },
      { param: "Tren de Aterrizaje", value: "Reforzado de alta resistencia para pistas de tierra" }
    ]
  };

  return (
    <section id="flota" className="relative min-h-screen bg-surface-container-lowest overflow-hidden py-32 border-b border-outline-variant/10">
      
      {/* Background Ambience Dots */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(234,179,8,0.03),transparent_45%)] pointer-events-none" />

      <div className="relative z-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full">
        
        {/* Title Block with Badge */}
        <div className="mb-20 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-500 text-[10px] font-bold uppercase tracking-widest mb-4">
            <Plane className="w-3.5 h-3.5" />
            Flota de Elite Oficial de Air Tractor
          </div>
          <h2 className="font-display text-4xl md:text-6xl font-black text-white tracking-tighter mb-4 leading-tight">
            El Gigante del Aire: <br className="hidden md:inline"/>
            <span className="text-secondary-container">Air Tractor AT-802A</span>
          </h2>
          <p className="text-on-surface-variant text-lg md:text-xl max-w-3xl leading-relaxed">
            Operamos la aeronave de aplicación agrícola más grande de la industria global. Un coloso tecnológico diseñado específicamente para labores de alta productividad, con un rendimiento inalcanzable para máquinas del siglo pasado.
          </p>
        </div>

        {/* Central interactive grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch mb-20">
          
          {/* Left Column: Visual schematic & Hotspots */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-surface-base/40 border border-outline-variant/15 rounded-3xl p-6 md:p-10 relative overflow-hidden">
            
            {/* Watermark Blueprint */}
            <div className="absolute top-2 right-4 text-[9px] font-mono text-outline-variant/30 uppercase tracking-widest pointer-events-none">
              AEROSCHEMA AT-802A // REV.05
            </div>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/10 group mb-8">
              <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-700 group-hover:scale-105"
                style={{ 
                  backgroundImage: "url('/avion.png')",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/20 to-transparent" />
              
              {/* Hotspot Indicators */}
              <div className="absolute inset-0 hidden md:block">
                {[
                  { id: 'motor', x: '15%', y: '42%', label: 'PT6A-67AG Turbine' },
                  { id: 'tolva', x: '45%', y: '48%', label: '800 Gal Hopper' },
                  { id: 'guiado', x: '55%', y: '32%', label: 'Satloc G4 Cockpit' },
                  { id: 'aspersores', x: '70%', y: '65%', label: 'CP Variable Nozzles' }
                ].map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setActiveHotspot(pt.id as any)}
                    className="absolute group/pt -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                    style={{ left: pt.x, top: pt.y }}
                  >
                    <div className="relative">
                      <div className="absolute -inset-2 bg-yellow-500/30 rounded-full animate-ping pointer-events-none" />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs transition-all ${
                        activeHotspot === pt.id 
                          ? 'bg-secondary-container text-on-secondary-container border-secondary-container scale-110 shadow-lg' 
                          : 'bg-surface-base/80 text-white border-outline-variant/40 hover:bg-yellow-500 hover:text-black hover:border-yellow-500'
                      }`}>
                        {pt.id === 'motor' ? 'M' : pt.id === 'tolva' ? 'T' : pt.id === 'guiado' ? 'G' : 'B'}
                      </div>
                      <span className="absolute left-10 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black/90 border border-outline-variant/20 py-1 px-2.5 rounded text-[10px] font-bold text-white uppercase tracking-wider opacity-0 group-hover/pt:opacity-100 transition-opacity pointer-events-none shadow-md backdrop-blur-sm">
                        {pt.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Bottom bar overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-surface-base/75 backdrop-blur-md p-3 rounded-lg border border-outline-variant/20 flex justify-between items-center text-xs">
                <span className="text-white/90 font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse inline-block" />
                  Air Tractor AT-802A - Esquema Técnico
                </span>
              </div>
            </div>

            {/* Mobile Hotspot Selectors */}
            <div className="flex flex-wrap gap-2 mb-4 md:hidden">
              {[
                { id: 'motor', label: '1. Motor Turbine' },
                { id: 'tolva', label: '2. Tolva 3028L' },
                { id: 'guiado', label: '3. GPS Satloc G4' },
                { id: 'aspersores', label: '4. Boquillas' }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setActiveHotspot(btn.id as any)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase border transition-all ${
                    activeHotspot === btn.id
                      ? 'bg-secondary-container text-on-secondary-container border-secondary-container'
                      : 'bg-surface-base/40 text-on-surface-variant border-outline-variant/30'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Micro Details output */}
            <div className="w-full text-xs font-mono text-on-surface-variant bg-surface-base/50 p-4 rounded-xl border border-outline-variant/15 flex flex-wrap gap-x-6 gap-y-2">
              <div>HOMOLOGADO ANAC: <strong className="text-white font-mono">SÍ (CETA ACTIVO)</strong></div>
              <div>PREPARATIVOS EN PISTA: <strong className="text-white font-mono">&lt; 10 MINUTOS</strong></div>
              <div>CANTIDAD EN FLOTA: <strong className="text-white font-mono">DISPONIBILIDAD TOTAL</strong></div>
            </div>

          </div>

          {/* Right Column: Hotspot content information */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-surface-container/60 border border-outline-variant/10 rounded-3xl p-8 md:p-10 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeHotspot}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full justify-between gap-8"
              >
                <div>
                  <span className="text-secondary-container text-[10px] font-bold uppercase tracking-[0.25em] mb-3 block">
                    Componente Seleccionado
                  </span>
                  <h4 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight mb-4">
                    {hotspots[activeHotspot].title}
                  </h4>
                  <div className="h-1 w-16 bg-yellow-500 mb-6" />
                  <p className="text-on-surface-variant text-base leading-relaxed mb-8">
                    {hotspots[activeHotspot].desc}
                  </p>
                </div>

                <div className="space-y-4">
                  <h5 className="text-[10px] text-white/50 font-black uppercase tracking-wider">Especificaciones de Componente:</h5>
                  <div className="grid grid-cols-1 gap-3">
                    {hotspots[activeHotspot].stats.map((st, sIdx) => (
                      <div key={sIdx} className="flex justify-between items-center py-2.5 px-4 bg-surface-base/40 rounded-lg border border-outline-variant/15 text-sm font-semibold">
                        <span className="text-on-surface-variant font-medium">{st.label}</span>
                        <span className="text-white font-mono">{st.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* Technical specifications sheet block */}
        <div className="bg-surface-container/30 border border-outline-variant/10 rounded-3xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-outline-variant/15">
            <div>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">Manual & Tabla de Especificaciones</h3>
              <p className="text-on-surface-variant text-xs mt-1">Comparativa directa extraída de la información oficial de ingeniería de Air Tractor.</p>
            </div>
            
            {/* Tabs selector */}
            <div className="flex gap-2">
              {[
                { id: 'tecnicas', label: 'DATOS MECÁNICOS' },
                { id: 'dimensiones', label: 'DIMENSIONES Y PESOS' }
              ].map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => setActiveSpecTab(tb.id as any)}
                  className={`px-4 py-2 rounded text-[10px] font-black tracking-widest uppercase transition-all duration-200 border ${
                    activeSpecTab === tb.id
                      ? 'bg-secondary-container text-on-secondary-container border-secondary-container shadow shadow-secondary-container/10'
                      : 'bg-surface-base/30 text-on-surface-variant border-outline-variant/20 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>
          </div>

          {/* Specs List rendering */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            {specs[activeSpecTab].map((sp, specIdx) => (
              <div 
                key={specIdx} 
                className="flex justify-between items-center py-3.5 border-b border-outline-variant/10 text-sm hover:bg-white/[0.01] px-2 transition-all group"
              >
                <span className="text-on-surface-variant group-hover:text-white duration-200">{sp.param}</span>
                <span className="text-white font-bold font-mono text-right">{sp.value}</span>
              </div>
            ))}
          </div>

          {/* Official Link and Callout */}
          <div className="mt-12 p-6 bg-yellow-500/5 rounded-2xl border border-yellow-500/15 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 bg-yellow-500/15 rounded-full flex items-center justify-center text-yellow-500 flex-shrink-0">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">¿Desea validar los parámetros de la aeronave directamente del fabricante?</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">Toda la información anterior está respaldada por la ficha técnica oficial del AT-802A provista por Air Tractor Inc. en Texas, Estados Unidos.</p>
              </div>
            </div>
            
            <a 
              href="https://airtractor.com/aircraft/at-802a/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-6 py-3 rounded-md font-bold uppercase tracking-widest text-xs transition-all hover:brightness-110 active:scale-95 whitespace-nowrap shadow-md"
            >
              Ficha en AirTractor.com <ArrowRight className="w-4 h-4" />
            </a>
          </div>

        </div>

      </div>
    </section>
  );
};

const CompromisoYEquipo = () => {
  const [activeTab, setActiveTab] = useState<'certificaciones' | 'equipo' | 'financiacion'>('certificaciones');

  const team = [
    { name: "Fernando Camarda", role: "Director de Operaciones / Piloto", desc: "Comanda con precisión de alta ingeniería la escuadra de aeronaves, calibrando caudales y rumbos de vuelo en el NOA." },
    { name: "Jorgelina Camarda", role: "Coordinadora de Administración", desc: "Gestión interna y enlace operativo impositivo de la firma para brindar respuestas inmediatas." },
    { name: "Susana Camarda", role: "Facturación, Ventas y Comercial", desc: "Asistencia directa en los contratos y formulación financiera de cada campaña agrícola." },
    { name: "Miguel Camarda", role: "Logística y Apoyo Terrestre", desc: "Supervisor de sistemas de carga rápida y calibraciones psicrométricas de gota en pista." },
    { name: "Alejandra Camarda", role: "Relaciones de Agro & Cliente", desc: "Atención personalizada para el seguimiento y satisfacción de cada productor en el campo." }
  ];

  const cards = [
    { name: "AgroNación", bank: "Banco Nación" },
    { name: "Galicia Rural", bank: "Banco Galicia" },
    { name: "Procampo", bank: "Banco Provincia" },
    { name: "Santander Agro", bank: "Banco Santander" },
    { name: "BBVA Agro", bank: "Banco BBVA" },
    { name: "Tarjeta Naranja Rural", bank: "Naranja" }
  ];

  return (
    <section id="compromiso" className="py-24 bg-surface-container relative overflow-hidden border-t border-b border-outline-variant/15">
      {/* Background radial accent */}
      <div className="absolute top-[30%] left-[5%] w-[350px] h-[350px] bg-secondary-container/5 rounded-full filter blur-[100px] pointer-events-none" />
      
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-secondary-container text-xs font-bold uppercase tracking-[0.2em] mb-3 block">
            Respaldo Corporativo & Humano
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">
            Compromiso Legal, <span className="text-secondary-container">Fintech & Familiar</span>
          </h2>
          <p className="text-on-surface-variant text-base">
            En Aerosoluciones respaldamos su inversión con la absoluta certificación legal y comercial que exige la actividad agroindustrial argentina.
          </p>
        </div>

        {/* Tab buttons design */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            { id: 'certificaciones', flagLabel: 'Habilitación CETA', icon: Award, label: 'CETA & CUIT LEGAL' },
            { id: 'equipo', flagLabel: 'Personal de Tierra/Aire', icon: Users, label: 'NUESTRO EQUIPO' },
            { id: 'financiacion', flagLabel: 'Convenios Agrarios', icon: CreditCard, label: 'TARJETAS PARA EL AGRO' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-6 py-3 rounded-lg border text-sm font-bold tracking-wider uppercase transition-all duration-300 active:scale-95 ${
                activeTab === tab.id
                  ? 'bg-secondary-container text-on-secondary-container border-secondary-container shadow-lg shadow-secondary-container/10'
                  : 'bg-surface-base/40 text-on-surface-variant border-outline-variant/20 hover:border-secondary-container/40 hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab contents card display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="glass-panel p-8 md:p-12 rounded-3xl border border-outline-variant/20 shadow-2xl"
          >
            {activeTab === 'certificaciones' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-6">
                  <div className="inline-block bg-green-500/10 border border-green-500/30 text-green-400 font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded">
                    Cumplimiento Regulatorio Absoluto
                  </div>
                  <h3 className="font-display text-3xl font-bold text-white tracking-tight">
                    CETA de ANAC: La Garantía Legal del Aire
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed">
                    Operamos bajo la rigurosa fiscalización de la <strong className="text-white">Administración Nacional de Aviación Civil (ANAC)</strong> de la República Argentina, contando con nuestro <strong className="text-white">Certificado de Explotación de Trabajo Aéreo (CETA)</strong> vigente.
                  </p>
                  <p className="text-on-surface-variant leading-relaxed text-sm">
                    Este certificado garantiza que toda pulverización, fertilización o siembra en su parcela cumple con las leyes de aeronavegabilidad, pólizas de seguros obligatorias contra terceros y calibración técnica autorizada.
                  </p>
                  <div className="p-4 bg-surface-base/50 rounded-xl border border-outline-variant/20 font-mono text-xs text-on-surface-variant space-y-2">
                    <div className="flex justify-between border-b border-outline-variant/10 pb-1.5">
                      <span>RUMP / REGULADOR:</span>
                      <strong className="text-white font-mono">ANAC ARGENTINA</strong>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/10 pb-1.5">
                      <span>CUIT FISCAL DE LA FIRMA:</span>
                      <strong className="text-white font-mono">20-18067895-7</strong>
                    </div>
                    <div className="flex justify-between text-secondary-container font-black">
                      <span>ESTADO TRIBUTARIO:</span>
                      <span>I.V.A. RESPONSABLE INSCRIPTO</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-surface-base to-surface-container p-8 rounded-2xl border border-outline-variant/10 relative overflow-hidden flex flex-col justify-between h-full min-h-[300px]">
                  <div className="absolute top-0 right-0 py-1.5 px-3 bg-secondary-container/10 text-secondary-container border-b border-l border-outline-variant/15 text-[9px] font-mono tracking-widest uppercase font-black">
                    Seguridad Blindada
                  </div>
                  <Award className="w-12 h-12 text-secondary-container mb-6" />
                  <div className="space-y-4">
                    <h4 className="text-xl font-bold text-white">¿Por qué es crucial el CETA?</h4>
                    <p className="text-sm text-on-surface-variant/90 leading-relaxed">
                      La ley de navegación argentina exige que cualquier servicio aéreo disponga de esta oblea. Contratar empresas sin CETA incurre en riesgos legales catastróficos para el propietario del cultivo ante derivas accidentales o incidentes en pista. En Aerosoluciones, operamos 100% blindados.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'equipo' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <div>
                    <h3 className="font-display text-3xl font-bold text-white tracking-tight">Nuestra Familia Operativa</h3>
                    <p className="text-on-surface-variant text-sm mt-1">
                      Un equipo consolidado de profesionales comprometidos con cada hectárea de su campo.
                    </p>
                  </div>
                  <span className="text-[10px] text-secondary-container bg-secondary-container/15 px-3 py-1 border border-secondary-container/20 rounded-full font-extrabold uppercase tracking-widest leading-none">
                    Familia Camarda
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {team.map((member, i) => (
                    <div key={i} className="bg-surface-base/60 p-6 rounded-2xl border border-outline-variant/15 flex flex-col justify-between hover:border-secondary-container/40 duration-300 transition-all font-sans">
                      <div>
                        <div className="w-10 h-10 bg-secondary-container/10 rounded-lg flex items-center justify-center text-secondary-container mb-4 font-black font-mono text-sm">
                          {member.name.split(" ")[0][0]}C
                        </div>
                        <h4 className="font-bold text-white text-base leading-tight mb-1">{member.name}</h4>
                        <span className="text-[10px] font-black text-secondary-container uppercase tracking-wider block mb-3">{member.role}</span>
                        <p className="text-on-surface-variant text-xs leading-relaxed">{member.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'financiacion' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-6">
                  <div className="inline-block bg-secondary-container/15 border border-secondary-container/30 text-secondary-container font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded">
                    Financiación Flexible
                  </div>
                  <h3 className="font-display text-3xl font-bold text-white tracking-tight">
                    Soporte para todas las Tarjetas del Agro
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed">
                    Sabemos que el financiamiento de la campaña es clave para el éxito del productor. Por eso, acompañamos el ritmo de comercialización de sus granos admitiendo pagos con <strong className="text-white">todas las líneas de Tarjetas Agropecuarias</strong> de Argentina.
                  </p>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    Consulte plazos de pesificación, convenios a cosecha y tasas diferenciales de canje con nuestro departamento de administración comercial.
                  </p>
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant/80 font-black block mb-4 uppercase tracking-widest">
                    Líneas Admitidas Activas:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {cards.map((card, i) => (
                      <div key={i} className="bg-surface-base/80 p-5 rounded-xl border border-outline-variant/10 hover:border-secondary-container/30 duration-300 transition-all flex flex-col justify-center">
                        <CreditCard className="w-5 h-5 text-secondary-container mb-2" />
                        <span className="font-bold text-white text-sm font-sans block leading-none">{card.name}</span>
                        <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider mt-1">{card.bank}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
};

const getCompassDirection = (deg: number) => {
  const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return directions[index];
};

const AgroWeatherMonitor = ({ onWeatherUpdate }: { onWeatherUpdate: (data: WeatherData) => void }) => {
  const [temp, setTemp] = useState(25);
  const [humidity, setHumidity] = useState(55);
  const [windSpeed, setWindSpeed] = useState(8);
  const [windDir, setWindDir] = useState(60);
  const [selectedCityName, setSelectedCityName] = useState("Las Lajitas (Salta)");
  const [simulationScenario, setSimulationScenario] = useState("Tiempo Real");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    // Al iniciar, cargar automaticamente el clima en vivo de Las Lajitas de forma real
    fetchAgroWeather(-25.07, -64.25, "Las Lajitas (Salta)");
  }, []);

  const agroCentres = [
    { name: "Las Lajitas (Salta)", lat: -25.07, lon: -64.25 },
    { name: "Joaquín V. González (Salta)", lat: -25.08, lon: -64.18 },
    { name: "Metán (Salta)", lat: -25.49, lon: -64.97 },
    { name: "Tucumán (Agro NOA)", lat: -26.82, lon: -65.22 },
    { name: "Charata (Chaco)", lat: -27.21, lon: -61.18 },
    { name: "Pergamino (Buenos Aires)", lat: -33.89, lon: -60.57 }
  ];

  // Fetch meteorological data from free keyless Open-Meteo API
  const fetchAgroWeather = async (lat: number, lon: number, label: string) => {
    setLoading(true);
    setSearchError("");
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`
      );
      if (!response.ok) throw new Error("Error de conexión con el servicio meteorológico.");
      const data = await response.json();
      
      if (data.current) {
        // Convert to rounded integer values matches the UI
        setTemp(Math.round(data.current.temperature_2m));
        setHumidity(Math.round(data.current.relative_humidity_2m));
        // Open-Meteo wind is km/h by default
        setWindSpeed(Math.round(data.current.wind_speed_10m));
        setWindDir(Math.round(data.current.wind_direction_10m));
        setSelectedCityName(label);
        setSimulationScenario("Tiempo Real");
      }
    } catch (err: any) {
      setSearchError("No se pudo obtener el clima actual. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Free OpenStreetMap Nominatim geocoding to support user-typed locations globally or in Arg
  const handleCustomSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearchError("");
    try {
      const searchRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`
      );
      const searchData = await searchRes.json();
      if (searchData && searchData.length > 0) {
        const first = searchData[0];
        fetchAgroWeather(parseFloat(first.lat), parseFloat(first.lon), first.display_name.split(",")[0]);
      } else {
        setSearchError("Lugar no encontrado. Pruebe especificando provincia o país.");
        setLoading(false);
      }
    } catch (err) {
      setSearchError("Servicio de geolocalización temporalmente no disponible.");
      setLoading(false);
    }
  };

  // Stull's formula approximation for Wet Bulb temperature
  const calculateWetBulb = (t: number, rh: number) => {
    const tw = t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) + 
               Math.atan(t + rh) - 
               Math.atan(rh - 1.676331) + 
               0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 
               4.686035;
    return Math.max(0, tw);
  };

  const wetBulb = calculateWetBulb(temp, humidity);
  const deltaT = Number((temp - wetBulb).toFixed(1));

  // Determine Flight Safety Status
  let status: { label: string; color: string; bg: string; border: string; desc: string; icon: any; scale: string } = {
    label: "ÓPTIMO PARA APLICAR (VENTANA SEGURA)",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    desc: "Condiciones excelentes para la aeroaplicación convencional. Óptima penetración de gota, adecuada evaporación y mínimo riesgo de deriva física.",
    icon: ShieldCheck,
    scale: "Óptima / Segura"
  };

  if (windSpeed < 3) {
    status = {
      label: "INVERSIÓN TÉRMICA DETECTADA",
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      desc: "Viento inferior a 3 km/h. Se prohíbe la aplicación debido a posible inversión térmica: las microgotas no sedimentan y quedan en suspensión flotando lateralmente por kilómetros de forma impredecible.",
      icon: AlertTriangle,
      scale: "Inversión Térmica (Prohibido)"
    };
  } else if (windSpeed > 15) {
    status = {
      label: "OPERACIÓN SUSPENDIDA POR VIENTO",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      desc: "Velocidad de viento superior al límite seguro legal de 15 km/h. Alto riesgo de deriva física fuera de las delimitaciones de cultivo. Suspensión recomendada.",
      icon: AlertTriangle,
      scale: "Insegura (Deriva Crítica)"
    };
  } else if (deltaT < 2) {
    status = {
      label: "DELTA T BAJO: RIESGO DE COALESCENCIA",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      desc: "Delta T inferior a 2°C (ambiente casi saturado). Las gotas tardan demasiado en secarse con alta probabilidad de escurrimiento o neblinas estancadas. Aplicar solo con boquillas antideriva especiales.",
      icon: Info,
      scale: "Coalescencia / Sat."
    };
  } else if (deltaT > 8) {
    status = {
      label: "DELTA T CRÍTICO: ALTA EVAPORACIÓN",
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      desc: "Evaporación extremadamente veloz de la gota agrícola. Requiere obligatorio el uso de coadyuvantes antideriva/anti-evaporantes de alta calidad o el aumento del volumen de caldo de aplicación (gotas más grandes >300 micrones).",
      icon: AlertTriangle,
      scale: "Evaporación Acelerada"
    };
  } else if (windSpeed >= 12 && windSpeed <= 15) {
    status = {
      label: "PRECAUCIÓN: LÍMITE DE DERIVA",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
      desc: "Velocidad de viento media-alta (12 a 15 km/h). Extreme recaudos, oriente boquillas hacia atrás del ala para agrandar el tamaño de la gota y mantenga distancias mayores con colindancias habitadas.",
      icon: Info,
      scale: "Límite Técnico"
    };
  }

  // Agronomic calculations for advanced HUD panel
  const getDropCategory = (dt: number) => {
    if (dt > 8) return { label: "Muy Gruesa (>350 µm)", color: "text-orange-400", desc: "Gotas grandes para contrarrestar la alta tasa de evaporación." };
    if (dt < 2) return { label: "Gota Fina / No Operativo", color: "text-amber-500", desc: "Peligro de estancamiento de niebla. Usar antideriva obligatoriamente." };
    if (dt >= 2 && dt <= 5) return { label: "Estándar / Mediana (200-250 µm)", color: "text-green-400", desc: "Ideal para excelente cobertura foliar e insecticidas/fungicidas." };
    return { label: "Gruesa (250-350 µm)", color: "text-green-300", desc: "Condiciones estables. Ideal para herbicidas sistémicos." };
  };

  const getAdjuvantRecommendation = (dt: number) => {
    if (dt > 8) return "Aceite Metilado (MSO) + Antievaporante Acrílico @ 1.0 L/ha";
    if (dt >= 5 && dt <= 8) return "Coadyuvante Siliconado Humectante + Aceite vegetal refinado @ 0.5 L/ha";
    return "Tensioactivo Organosiliconado estándar + Antiespumante @ 0.2 L/ha";
  };

  const getEvaporationLoss = (dt: number, t: number) => {
    if (dt > 8) return Math.min(30 + Math.round((t - 30) * 1.5), 55);
    if (dt < 2) return 3;
    return Math.round(dt * 2.2);
  };

  const dropCat = getDropCategory(deltaT);
  const adjuvant = getAdjuvantRecommendation(deltaT);
  const evapLoss = getEvaporationLoss(deltaT, temp);

  // Push weather data to context for AeroBot
  useEffect(() => {
    onWeatherUpdate({
      temp, humidity, windSpeed, windDir,
      wetBulb, deltaT, evapLoss,
      status: { label: status.label, color: status.color, desc: status.desc, scale: status.scale },
      dropCat: { label: dropCat.label, color: dropCat.color, desc: dropCat.desc },
      adjuvant,
      volume: deltaT > 8 ? '8-10 L/ha' : deltaT < 2 ? '15-20 L/ha' : '10-15 L/ha',
      cityName: selectedCityName,
    });
  }, [temp, humidity, windSpeed, windDir, deltaT, evapLoss, selectedCityName]);

  const generatePdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header bar
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setFillColor(234, 179, 8);
    doc.rect(0, 40, pageWidth, 3, 'F');

    // Logo placeholder / Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('AEROSOLUCIONES', 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text('Ingeniería Aeroagrícola — Reporte de Planificación de Vuelo', 14, 28);

    // Timestamp
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const now = new Date().toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' });
    doc.text(`Generado: ${now}`, pageWidth - 14, 18, { align: 'right' });
    doc.text(`Ubicación: ${selectedCityName}`, pageWidth - 14, 28, { align: 'right' });

    // Section: Condiciones Meteorológicas
    let y = 55;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 26);
    doc.text('Condiciones Meteorológicas', 14, y);
    y += 4;
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.8);
    doc.line(14, y, 55, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Parámetro', 'Valor']],
      body: [
        ['Temperatura Ambiente', `${temp}°C`],
        ['Humedad Relativa', `${humidity}%`],
        ['Velocidad del Viento', `${windSpeed} km/h`],
        ['Dirección del Viento', `${getCompassDirection(windDir)} (${windDir}°)`],
        ['Temperatura Bulbo Húmedo', `${wetBulb.toFixed(1)}°C`],
        ['Delta T', `${deltaT}°C`],
        ['Pérdida por Evaporación', `${evapLoss}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [26, 26, 26], textColor: [234, 179, 8], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Section: Estado Operativo
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 26);
    doc.text('Estado Operativo', 14, y);
    y += 4;
    doc.line(14, y, 45, y);
    y += 6;

    const statusColor = status.label.includes('ÓPTIMO') ? [34, 197, 94] : status.label.includes('SUSPENDIDA') ? [239, 68, 68] : [245, 158, 11];
    doc.setFillColor(...statusColor);
    doc.roundedRect(14, y, pageWidth - 28, 14, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(status.label, 20, y + 9);

    y += 22;

    // Section: Prescripción Técnica
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 26);
    doc.text('Prescripción Técnica', 14, y);
    y += 4;
    doc.line(14, y, 48, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Recomendación', 'Detalle']],
      body: [
        ['Categoría de Gota', dropCat.label],
        ['Coadyuvante', adjuvant],
        ['Volumen Mínimo', deltaT > 8 ? '8-10 L/ha' : deltaT < 2 ? '15-20 L/ha' : '10-15 L/ha'],
        ['Escala de Seguridad', status.scale],
      ],
      theme: 'grid',
      headStyles: { fillColor: [26, 26, 26], textColor: [234, 179, 8], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Section: Observaciones
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 26);
    doc.text('Observaciones', 14, y);
    y += 4;
    doc.line(14, y, 38, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const obsLines = doc.splitTextToSize(status.desc, pageWidth - 28);
    doc.text(obsLines, 14, y);
    y += obsLines.length * 5 + 10;

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = Math.max(y, pageHeight - 25);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, footerY, pageWidth - 14, footerY);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Aerosoluciones — CUIT 20-18067895-7 — CETA ANAC Vigente — Las Lajitas, Salta, Argentina', 14, footerY + 6);
    doc.text('Este reporte es orientativo. Consulte siempre con el operador antes de la aplicación.', pageWidth - 14, footerY + 6, { align: 'right' });

    doc.save(`Aerosoluciones_Planificacion_${selectedCityName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const presets = [
    { name: "Mañana Ideal (Óptimo)", temp: 19, hum: 70, wind: 6, dir: 120 },
    { name: "Mediodía Seco (Alto Delta T)", temp: 32, hum: 25, wind: 9, dir: 180 },
    { name: "Viento Crítico (Peligro)", temp: 24, hum: 55, wind: 18, dir: 270 },
    { name: "Calma de Tarde (Inversión)", temp: 15, hum: 85, wind: 1.5, dir: 45 }
  ];

  return (
    <section id="planificacion" className="py-24 bg-surface-base relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(234,179,8,0.06),transparent_50%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-secondary-container/5 rounded-full filter blur-[120px]" />
      </div>

      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-secondary-container/10 border border-secondary-container/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-secondary-container text-[10px] font-bold uppercase tracking-[0.2em]">
              Sistema en Tiempo Real
            </span>
          </div>
          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter mb-4">
            Planificación y <span className="text-secondary-container">Asistencia en Vuelo</span>
          </h2>
          <p className="text-on-surface-variant text-base md:text-lg max-w-xl mx-auto">
            Datos satelitales en vivo, modelado de deriva y prescripción técnica integrada.
          </p>
        </motion.div>

        {/* Live Metrics HUD Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-surface-container/80 to-surface-container/40 border border-outline-variant/15 rounded-2xl p-4 mb-6 backdrop-blur-md"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
            <div className="text-center">
              <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold block">Delta T</span>
              <span className={`text-xl font-black font-mono ${dropCat.color}`}>{deltaT}°C</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold block">Bulbo Húmedo</span>
              <span className="text-xl font-black font-mono text-white">{wetBulb.toFixed(1)}°C</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold block">Viento</span>
              <span className="text-xl font-black font-mono text-white">{windSpeed} <span className="text-sm text-on-surface-variant/60">km/h</span></span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold block">Humedad</span>
              <span className="text-xl font-black font-mono text-white">{humidity}<span className="text-sm text-on-surface-variant/60">%</span></span>
            </div>
            <div className="text-center hidden md:block">
              <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold block">Evaporación</span>
              <span className={`text-xl font-black font-mono ${evapLoss > 15 ? "text-orange-400" : "text-green-400"}`}>{evapLoss}%</span>
            </div>
          </div>
        </motion.div>

        {/* Safety Status Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`${status.bg} ${status.border} border rounded-xl p-4 mb-6 flex items-center gap-4`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${status.bg} border ${status.border}`}>
            <status.icon className={`w-5 h-5 ${status.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-sm font-black uppercase tracking-wider ${status.color}`}>{status.label}</span>
            <p className="text-xs text-on-surface-variant/70 mt-0.5 line-clamp-2">{status.desc}</p>
          </div>
          <div className="hidden sm:block text-right flex-shrink-0">
            <span className={`text-2xl font-black font-mono ${status.color}`}>{status.scale.split(" ")[0]}</span>
          </div>
        </motion.div>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Controls */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Weather Selector */}
            <div className="bg-surface-container/40 border border-outline-variant/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-secondary-container" />
                  Ubicación
                </span>
                <span className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {selectedCityName.includes("(") ? selectedCityName.split("(")[0].trim() : selectedCityName}
                </span>
              </div>

              <form onSubmit={handleCustomSearch} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="flex-1 bg-surface-base/50 border border-outline-variant/15 rounded-lg pl-3 pr-3 py-2.5 text-sm text-white focus:border-secondary-container outline-none transition-all placeholder:text-on-surface-variant/30"
                />
                <button type="submit" disabled={loading} className="bg-secondary-container text-on-secondary-container px-4 rounded-lg text-sm font-bold active:scale-95">
                  {loading ? "..." : "Ir"}
                </button>
              </form>

              <div className="grid grid-cols-3 gap-1.5">
                {agroCentres.map((center, i) => (
                  <button
                    key={i}
                    onClick={() => fetchAgroWeather(center.lat, center.lon, center.name)}
                    className={`p-2 rounded-lg text-[10px] font-bold transition-all border text-center leading-tight ${
                      selectedCityName === center.name 
                        ? "bg-secondary-container/15 border-secondary-container/30 text-white"
                        : "bg-surface-base/20 border-outline-variant/10 text-on-surface-variant hover:border-secondary-container/20"
                    }`}
                  >
                    {center.name.split(" (")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Scenarios */}
            <div className="bg-surface-container/40 border border-outline-variant/15 rounded-xl p-5">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                <Wheat className="w-4 h-4 text-secondary-container" />
                Escenarios
              </span>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTemp(p.temp); setHumidity(p.hum); setWindSpeed(p.wind); setWindDir(p.dir);
                      setSimulationScenario("Simulado: " + p.name);
                    }}
                    className={`p-2.5 rounded-lg text-[10px] font-bold transition-all border text-left ${
                      simulationScenario === "Simulado: " + p.name
                        ? "bg-secondary-container/15 border-secondary-container/30 text-white"
                        : "bg-surface-base/20 border-outline-variant/10 text-on-surface-variant hover:border-secondary-container/20"
                    }`}
                  >
                    <span className="block text-white">{p.name.split(" ")[0]}</span>
                    <span className="text-on-surface-variant/50">{p.temp}°C / {p.hum}%</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Sliders */}
            <div className="bg-surface-container/40 border border-outline-variant/15 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-4 h-4 text-secondary-container" />
                  Ajuste Manual
                </span>
                <button 
                  onClick={() => { setTemp(25); setHumidity(55); setWindSpeed(8); setWindDir(60); setSimulationScenario("Reset"); }}
                  className="text-[10px] text-secondary-container font-bold uppercase"
                >
                  Reset
                </button>
              </div>
              
              <div className="space-y-4">
                {[
                  { icon: Wind, label: "Viento", value: windSpeed, unit: "km/h", min: 0, max: 25, step: 0.5, set: setWindSpeed },
                  { icon: Thermometer, label: "Temp", value: temp, unit: "°C", min: 5, max: 45, step: 1, set: setTemp },
                  { icon: Droplets, label: "Humedad", value: humidity, unit: "%", min: 10, max: 95, step: 1, set: setHumidity }
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1.5">
                        <item.icon className="w-3.5 h-3.5 text-secondary-container" />
                        {item.label}
                      </label>
                      <span className="text-xs font-mono font-black text-white">{item.value} {item.unit}</span>
                    </div>
                    <input 
                      type="range" min={item.min} max={item.max} step={item.step} value={item.value} 
                      onChange={(e) => { item.set(Number(e.target.value)); setSimulationScenario("Manual"); }}
                      className="w-full accent-secondary-container h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Prescription & Recommendations */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Prescription Panel */}
            <div className="bg-surface-container/40 border border-outline-variant/15 rounded-xl p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-secondary-container/10 flex items-center justify-center">
                  <Award className="w-4 h-4 text-secondary-container" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Prescripción Técnica</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-surface-base/30 rounded-xl border border-outline-variant/10">
                  <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold block mb-1">Categoría de Gota</span>
                  <span className={`text-lg font-black font-mono ${dropCat.color}`}>{dropCat.label}</span>
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">{dropCat.desc}</p>
                </div>
                <div className="p-4 bg-surface-base/30 rounded-xl border border-outline-variant/10">
                  <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold block mb-1">Coadyuvante</span>
                  <span className="text-sm font-bold text-white leading-snug">{adjuvant}</span>
                </div>
                <div className="p-4 bg-surface-base/30 rounded-xl border border-outline-variant/10">
                  <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold block mb-1">Volumen Mínimo</span>
                  <span className="text-lg font-black font-mono text-white">{deltaT > 8 ? "8-10 L/ha" : deltaT < 2 ? "15-20 L/ha" : "10-15 L/ha"}</span>
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">Según condiciones actuales</p>
                </div>
              </div>
            </div>

            {/* Wind Compass & Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-container/40 border border-outline-variant/15 rounded-xl p-6 flex items-center gap-6">
                <div className="relative w-28 h-28 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full border border-outline-variant/20" />
                  <div className="absolute inset-3 rounded-full border border-outline-variant/10" />
                  <motion.div 
                    animate={{ rotate: windDir }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-0.5 h-12 bg-gradient-to-t from-transparent to-secondary-container origin-bottom rounded-full" style={{ transformOrigin: "bottom center", marginBottom: "-24px" }} />
                  </motion.div>
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-on-surface-variant/40">N</div>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-on-surface-variant/40">S</div>
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-on-surface-variant/40">O</div>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-on-surface-variant/40">E</div>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold block mb-1">Dirección del Viento</span>
                  <span className="text-3xl font-black font-mono text-white">{getCompassDirection(windDir)}</span>
                  <span className="text-xs text-on-surface-variant/60 block">{windDir}° | {windSpeed} km/h</span>
                </div>
              </div>

              <div className="bg-surface-container/40 border border-outline-variant/15 rounded-xl p-6 flex flex-col justify-center">
                <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-bold block mb-3">Resumen de Condiciones</span>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Temp. Ambiente</span>
                    <span className="font-mono font-bold text-white">{temp}°C</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Temp. Bulbo Húmedo</span>
                    <span className="font-mono font-bold text-white">{wetBulb.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Delta T</span>
                    <span className={`font-mono font-bold ${dropCat.color}`}>{deltaT}°C</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Pérdida Evap.</span>
                    <span className={`font-mono font-bold ${evapLoss > 15 ? "text-orange-400" : "text-green-400"}`}>{evapLoss}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button className="flex-1 bg-secondary-container hover:bg-secondary-container-high text-on-secondary-container py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                Contactar Operador
              </button>
              <button onClick={generatePdf} className="flex-1 bg-surface-container/50 hover:bg-surface-container border border-outline-variant/15 text-white py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Stats = () => (
  <section className="py-24 bg-primary-container relative">
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-2 lg:grid-cols-4 gap-12">
      {[
        { v: '500k+', l: 'Hectáreas Cubiertas' },
        { v: '120+', l: 'Clientes Satisfechos' },
        { v: '15', l: 'Años de Experiencia' },
        { v: '0', l: 'Incidentes de Seguridad' }
      ].map((stat, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="text-center group"
        >
          <span className="block font-display text-5xl md:text-6xl font-bold text-secondary-container mb-2 transition-transform group-hover:scale-110">{stat.v}</span>
          <span className="text-on-primary-container text-xs font-bold uppercase tracking-widest">{stat.l}</span>
        </motion.div>
      ))}
    </div>
  </section>
);

const Contact = () => (
  <section id="contacto" className="py-32 bg-surface-base">
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div className="flex flex-col lg:flex-row gap-24">
        <div className="w-full lg:w-1/3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-8">Solicite un Presupuesto</h2>
            <p className="text-on-surface-variant text-lg mb-12">
              Nuestros expertos evaluarán sus necesidades operativas para ofrecerle la solución logística más eficiente.
            </p>

            <div className="space-y-8">
              {[
                { icon: Phone, text: '+54 9 3877 668620 / 407080' },
                { icon: Mail, text: 'fernando@aerosoluciones.com.ar' },
                { icon: MapPin, text: 'Ruta Provincial N° 5, KM 95, Las Lajitas (Salta)' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-center group cursor-pointer hover:text-white transition-colors">
                  <div className="w-12 h-12 rounded-sm border border-outline-variant flex items-center justify-center group-hover:bg-secondary-container group-hover:text-on-secondary-container group-hover:border-transparent transition-all">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-on-surface group-hover:text-white">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="w-full lg:w-2/3"
        >
          <form className="glass-panel p-8 md:p-12 rounded-3xl border border-outline-variant/20 grid grid-cols-1 md:grid-cols-2 gap-8 hover:shadow-2xl hover:shadow-secondary-container/5 transition-all">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nombre Completo</label>
              <input type="text" className="w-full bg-surface-container border border-outline-variant p-4 text-white focus:border-secondary-container transition-all outline-none" placeholder="Ingresa tu nombre..." />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Correo Electrónico</label>
              <input type="email" className="w-full bg-surface-container border border-outline-variant p-4 text-white focus:border-secondary-container transition-all outline-none" placeholder="ejemplo@correo.com" />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tipo de Servicio</label>
              <select className="w-full bg-surface-container border border-outline-variant p-4 text-white focus:border-secondary-container transition-all outline-none appearance-none">
                <option>Pulverización Aérea</option>
                <option>Siembra Directa</option>
                <option>Fertilización</option>
                <option>Control de Incendios</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Superficie (Hectáreas)</label>
              <input type="number" className="w-full bg-surface-container border border-outline-variant p-4 text-white focus:border-secondary-container transition-all outline-none" placeholder="0" />
            </div>
            <div className="md:col-span-2 space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Detalles de la Operación</label>
              <textarea rows={4} className="w-full bg-surface-container border border-outline-variant p-4 text-white focus:border-secondary-container transition-all outline-none" placeholder="Cuéntanos más sobre tus necesidades..." />
            </div>
            <button className="md:col-span-2 bg-secondary-container text-on-secondary-container py-5 font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all hover-lift">
              Enviar Solicitud de Cotización
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-surface-container-lowest border-t border-outline-variant py-16">
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-10">
      <div className="flex flex-col items-center md:items-start gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="/logo-aerosoluciones.jpg" 
            alt="Aerosoluciones Logo" 
            className="h-12 w-auto object-contain transition-transform duration-300 hover:scale-105"
            referrerPolicy="no-referrer"
          />
        </div>
        <p className="text-on-surface-variant text-sm text-center md:text-left">
          © 2024 Aerosoluciones. Las Lajitas (Salta) - Argentina.<br />
          CETA ANAC Explotador Técnico • CUIT 20-18067895-7.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm font-semibold text-on-surface-variant">
        <a href="#" className="hover:text-white transition-colors">Privacidad</a>
        <a href="#" className="hover:text-white transition-colors">Términos</a>
        <a href="#" className="hover:text-white transition-colors">ANAC</a>
        <a href="#" className="hover:text-white transition-colors">Soporte</a>
      </div>

      <div className="flex gap-4">
        <button className="w-10 h-10 border border-outline-variant flex items-center justify-center hover:bg-secondary-container hover:text-on-secondary-container transition-all group">
          <Globe className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
        <button className="w-10 h-10 border border-outline-variant flex items-center justify-center hover:bg-secondary-container hover:text-on-secondary-container transition-all group">
          <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  </footer>
);

// --- AeroBot Chat Component ---
interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

const AeroBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const weather = useWeather();
  const forecasts = useForecasts();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 1,
          role: 'bot',
          text: '¡Hola! Soy AeroBot, asistente oficial de **Aero Soluciones**. 🛩️\n\nPuedo decirte cómo estará el clima HOY o MAÑANA en cualquier localidad de nuestra zona de operación.\n\nProbá preguntarme:\n• "¿Cómo estará mañana en Las Lajitas?"\n• "¿Puedo volar pasado mañana en Metán?"\n• "Condiciones de viento en Charata"',
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const quickReplies = [
    '¿Cómo estará mañana?',
    '¿Puedo volar hoy?',
    'Viento en Las Lajitas',
    'Pronóstico Metán',
    '¿Qué coadyuvante uso?',
  ];

  // Detect location name from query
  const detectLocation = (q: string): string | null => {
    const locations = ['las lajitas', 'lajitas', 'joaquin', 'joaquín', 'gonzalez', 'gonzález', 'metan', 'metán', 'tucuman', 'tucumán', 'charata', 'chaco', 'pergamino', 'buenos aires', 'salta'];
    for (const loc of locations) {
      if (q.includes(loc)) {
        if (loc === 'las lajitas' || loc === 'lajitas') return 'Las Lajitas';
        if (loc === 'joaquin' || loc === 'joaquín' || loc === 'gonzalez' || loc === 'gonzález') return 'Joaquín V. González';
        if (loc === 'metan' || loc === 'metán') return 'Metán';
        if (loc === 'tucuman' || loc === 'tucumán') return 'Tucumán';
        if (loc === 'charata' || loc === 'chaco') return 'Charata';
        if (loc === 'pergamino' || loc === 'buenos aires') return 'Pergamino';
        if (loc === 'salta') return 'Las Lajitas';
      }
    }
    return null;
  };

  // Detect day reference from query
  const detectDay = (q: string): number => {
    if (q.includes('pasado manana') || q.includes('pasado mañana') || q.includes('en 2') || q.includes('dos dias') || q.includes('dos días')) return 2;
    if (q.includes('en 3') || q.includes('tres dias') || q.includes('tres días')) return 3;
    if (q.includes('en 4') || q.includes('cuatro dias') || q.includes('cuatro días') || q.includes('semana')) return 4;
    if (q.includes('manana') || q.includes('mañana') || q.includes('proximo') || q.includes('próximo') || q.includes('siguiente') || q.includes('tomorrow')) return 1;
    return 0; // today
  };

  const generateResponse = (query: string): string => {
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const detectedLocation = detectLocation(q);
    const detectedDay = detectDay(q);

    // Location + day forecast query (e.g., "cómo estará mañana en Las Lajitas")
    if (detectedLocation && forecasts.length > 0) {
      const locForecast = forecasts.find(f => f.name === detectedLocation);
      if (!locForecast) return `No tengo datos de ${detectedLocation}. Nuestras zonas de operación son: Las Lajitas, Joaquín V. González, Metán, Tucumán, Charata y Pergamino.`;

      const dayForecast = locForecast.forecast[detectedDay];
      if (!dayForecast) return `Solo tengo pronóstico hasta 4 días. Probá con "hoy", "mañana" o "pasado mañana".`;

      const dayLabel = detectedDay === 0 ? 'HOY' : detectedDay === 1 ? 'MAÑANA' : detectedDay === 2 ? 'PASADO MAÑANA' : `En ${detectedDay} días`;

      return `📍 ${detectedLocation} (${locForecast.region}) — ${dayLabel}\n\n️ Temperatura: ${dayForecast.temp}°C\n💧 Humedad: ${dayForecast.humidity}%\n💨 Viento: ${dayForecast.windSpeed} km/h (${getCompassDirection(dayForecast.windDir)})\n Delta T: ${dayForecast.deltaT}°C\n🧊 Bulbo Húmedo: ${dayForecast.wetBulb}°C\n\n${dayForecast.flightStatus}\n\n ${dayForecast.recommendation}`;
    }

    // General "mañana" without location — use current dashboard location
    if ((q.includes('manana') || q.includes('mañana') || q.includes('proximo') || q.includes('próximo')) && weather) {
      const currentLocName = weather.cityName.split('(')[0].trim();
      const locForecast = forecasts.find(f => f.name === currentLocName) || forecasts[0];
      if (locForecast && locForecast.forecast[1]) {
        const tmrw = locForecast.forecast[1];
        return `📍 ${locForecast.name} — MAÑANA\n\n️ Temperatura: ${tmrw.temp}°C\n💧 Humedad: ${tmrw.humidity}%\n💨 Viento: ${tmrw.windSpeed} km/h (${getCompassDirection(tmrw.windDir)})\n Delta T: ${tmrw.deltaT}°C\n\n${tmrw.flightStatus}\n\n💡 ${tmrw.recommendation}`;
      }
    }

    // "Cómo estará" without specific location — show all locations for tomorrow
    if (q.includes('como estara') || q.includes('cómo estará') || q.includes('como estará') || q.includes('como esta') || q.includes('cómo está')) {
      if (forecasts.length === 0) return 'Cargando datos de pronóstico...';
      const dayIdx = detectedDay;
      const dayLabel = dayIdx === 0 ? 'HOY' : dayIdx === 1 ? 'MAÑANA' : dayIdx === 2 ? 'PASADO MAÑANA' : `En ${dayIdx} días`;

      let response = ` Pronóstico ${dayLabel} — Todas las localidades:\n\n`;
      forecasts.forEach(f => {
        const d = f.forecast[dayIdx];
        if (d) {
          const icon = d.flightStatus.includes('✅') ? '🟢' : d.flightStatus.includes('⛔') ? '🔴' : '🟡';
          response += `${icon} ${f.name}: ${d.temp}°C | Viento ${d.windSpeed} km/h | Delta T ${d.deltaT}°C\n`;
        }
      });
      response += `\nPodés preguntarme por una localidad específica para más detalle.`;
      return response;
    }

    // Current conditions (existing logic)
    if (!weather) return 'Aún no hay datos meteorológicos disponibles. Seleccioná una ubicación en el panel de planificación.';

    // Flight conditions
    if (q.includes('puedo volar') || q.includes('puedo aplicar') || q.includes('volar ahora') || q.includes('aplicar ahora') || q.includes('volar hoy')) {
      const isOptimal = weather.status.label.includes('ÓPTIMO') || weather.status.label.includes('✅');
      if (isOptimal) {
        return `✅ ¡Condiciones EXCELENTES para volar HOY!\n\n📊 Resumen:\n• Delta T: ${weather.deltaT}°C\n• Viento: ${weather.windSpeed} km/h\n• Humedad: ${weather.humidity}%\n• Temp: ${weather.temp}°C\n\nEstado: ${weather.status.label}\n\nPodés aplicar con confianza.`;
      } else {
        return `️ ${weather.status.label}\n\n📊 Condiciones actuales:\n• Delta T: ${weather.deltaT}°C\n• Viento: ${weather.windSpeed} km/h\n• Humedad: ${weather.humidity}%\n\nRecomendación: ${weather.status.label.includes('⛔') || weather.status.label.includes('SUSPENDIDA') ? 'NO aplicar hasta que mejoren las condiciones.' : 'Extreme precauciones y consulte con el operador.'}`;
      }
    }

    // Wind
    if (q.includes('viento') || q.includes('wind')) {
      const windStatus = weather.windSpeed < 3 ? '🔴 Calma excesiva - Riesgo de inversión térmica' : weather.windSpeed > 15 ? '🔴 Viento excesivo - Deriva crítica' : weather.windSpeed > 12 ? '🟡 Viento medio-alto - Precaución' : ' Viento dentro del rango seguro';
      return `💨 Condiciones del Viento:\n\n• Velocidad: ${weather.windSpeed} km/h\n• Dirección: ${getCompassDirection(weather.windDir)} (${weather.windDir}°)\n\n${windStatus}\n\n${weather.windSpeed < 3 ? ' No aplicar con viento menor a 3 km/h.' : weather.windSpeed > 15 ? '⛔ Suspender operaciones hasta que baje de 15 km/h.' : '✅ Rango operativo seguro (3-15 km/h).'}`;
    }

    // Delta T
    if (q.includes('delta') || q.includes('delta t') || q.includes('deltat')) {
      return `️ Delta T: ${weather.deltaT}°C\n\n${weather.deltaT > 8 ? '🔴 Delta T CRÍTICO - Alta evaporación\nNecesitás coadyuvantes antievaporantes urgentes.' : weather.deltaT < 2 ? ' Delta T BAJO - Riesgo de coalescencia\nGotas no secan adecuadamente. Usar antideriva.' : weather.deltaT >= 2 && weather.deltaT <= 5 ? ' Delta T ÓPTIMO\nCondiciones ideales para aplicación estándar.' : '🟢 Delta T ACEPTABLE\nCondiciones estables para herbicidas sistémicos.'}\n\nRango ideal: 2-5°C`;
    }

    // Adjuvant / coadyuvante
    if (q.includes('coadyuvante') || q.includes('adjuvant') || q.includes('aceite') || q.includes('que uso') || q.includes('producto')) {
      const adj = weather.adjuvant || 'Consultar con operador';
      return `🧪 Coadyuvante Recomendado:\n\n${adj}\n\n📋 Según condiciones actuales:\n• Delta T: ${weather.deltaT}°C\n• Evaporación estimada: ${weather.evapLoss}%\n\n${weather.deltaT > 8 ? '⚠️ Alta evaporación: El MSO es esencial para retener la gota en el follaje.' : weather.deltaT < 2 ? '⚠️ Baja evaporación: Priorizar antideriva para evitar coalescencia.' : '✅ Condiciones normales: Siliconado estándar es suficiente.'}`;
    }

    // Temperature / humidity
    if (q.includes('temperatura') || q.includes('temp ') || q.includes('humedad') || q.includes('clima actual') || q.includes('clima hoy')) {
      return `️ Condiciones Meteorológicas Actuales:\n\n📍 ${weather.cityName}\n️ Temperatura: ${weather.temp}°C\n💧 Humedad: ${weather.humidity}%\n💨 Viento: ${weather.windSpeed} km/h\n🧊 Bulbo Húmedo: ${weather.wetBulb.toFixed(1)}°C\n Delta T: ${weather.deltaT}°C\n\n${weather.status.label}`;
    }

    // Volume / dosis
    if (q.includes('volumen') || q.includes('dosis') || q.includes('litro') || q.includes('cantidad') || q.includes('caldo')) {
      const vol = weather.volume || '10-15 L/ha';
      return ` Volumen de Caldo Recomendado:\n\n${vol}\n\n📋 Factores considerados:\n• Delta T: ${weather.deltaT}°C\n• Evaporación: ${weather.evapLoss}%\n\n${weather.deltaT > 8 ? '️ Aumentar volumen para compensar evaporación acelerada.' : weather.deltaT < 2 ? '️ Mayor volumen necesario por riesgo de coalescencia.' : '✅ Volumen estándar adecuado para las condiciones.'}`;
    }

    // Drop category
    if (q.includes('gota') || q.includes('droplet') || q.includes('micron') || q.includes('tamaño')) {
      const cat = weather.dropCat.label || 'Estándar (200-250 µm)';
      return ` Categoría de Gota Recomendada:\n\n${cat}\n\n📊 Basado en:\n• Delta T: ${weather.deltaT}°C\n• Evaporación: ${weather.evapLoss}%\n\n${weather.deltaT > 8 ? '⚠️ Usar gotas muy gruesas (>350µm) para contrarrestar evaporación.' : weather.deltaT < 2 ? '️ Gotas finas peligrosas. Usar antideriva obligatoriamente.' : '✅ Tamaño de gota estándar adecuado.'}`;
    }

    // Recommendations
    if (q.includes('recomendacion') || q.includes('recomienda') || q.includes('consejo') || q.includes('sugerencia') || q.includes('tips')) {
      const adj = weather.adjuvant || 'Consultar con operador';
      const vol = weather.volume || '10-15 L/ha';
      const cat = weather.dropCat.label || 'Estándar';
      return `📋 Recomendaciones de Vuelo:\n\n1️⃣ Categoría de gota: ${cat}\n2️⃣ Coadyuvante: ${adj}\n3️⃣ Volumen: ${vol}\n4️⃣ Estado: ${weather.status.label}\n\n💡 Tips adicionales:\n${weather.windSpeed > 10 ? '• Viento medio-alto: orientar boquillas hacia atrás del ala' : '• Viento favorable: mantener orientación estándar'}\n${weather.deltaT > 6 ? '• Delta T alto: aplicar en horarios de menor temperatura' : '• Delta T aceptable: horario flexible'}\n• Siempre verificar inversión térmica antes de despegar\n• Mantener registro fotográfico de las condiciones`;
    }

    // Services
    if (q.includes('servicio') || q.includes('pulveriza') || q.includes('siembra') || q.includes('fertiliza') || q.includes('incendio')) {
      return `️ Nuestros Servicios:\n\n Pulverización Aérea\nAplicación precisa con tecnología Air Tractor AT-802A y guiado DGPS.\n\n Siembra Directa\nDistribución eficiente de semillas optimizando tiempos.\n\n💧 Fertilización Líquida\nNutrición óptima con dosificación variable.\n\n Control de Incendios\nRespuesta rápida con aeronaves especializadas.\n\n Contactanos para cotizar: +54 9 3877 668620`;
    }

    // Fleet
    if (q.includes('flota') || q.includes('avion') || q.includes('aeronave') || q.includes('air tractor') || q.includes('at-802')) {
      return `✈️ Nuestra Flota - Air Tractor AT-802A:\n\n Motor: Pratt & Whitney PT6A-67AG (1,350 SHP)\n Tolva: 3,028 Litros (800 Gal)\n Guiado: Satloc G4 DGPS submétrico\n📏 Envergadura: 18.04 metros\n Velocidad de trabajo: 241 km/h\n🛡️ CETA ANAC vigente\n\nEl avión de aplicación agrícola más grande del mundo.`;
    }

    // Contact
    if (q.includes('contacto') || q.includes('telefono') || q.includes('mail') || q.includes('email') || q.includes('llamar') || q.includes('hablar')) {
      return ` Contacto:\n\n📱 Tel: +54 9 3877 668620 / 407080\n📧 Email: fernando@aerosoluciones.com.ar\n📍 Ruta Provincial N° 5, KM 95, Las Lajitas (Salta)\n\n🕐 Horario de atención:\nLunes a Viernes: 7:00 - 18:00\nSábados: 7:00 - 13:00`;
    }

    // Greetings
    if (q.includes('hola') || q.includes('buenas') || q.includes('hey') || q.includes('hi') || q.includes('buenos')) {
      return `¡Hola! 👋 Soy AeroBot, asistente oficial de **Aero Soluciones**.\n\nPuedo ayudarte con:\n🌤️ Pronóstico por localidad (hoy, mañana, pasado mañana)\n✈️ Condiciones de vuelo actuales\n Coadyuvantes y dosificación\n💨 Análisis de viento y Delta T\n\nProbá: "¿Cómo estará mañana en Las Lajitas?"`;
    }

    // Thanks
    if (q.includes('gracias') || q.includes('thanks') || q.includes('genial') || q.includes('perfecto')) {
      return `¡De nada! 😊 Estoy acá para ayudarte con la planificación de vuelo.\n\nSi necesitás algo más, no dudes en preguntar. ¡Buen vuelo! `;
    }

    // Default
    return `No estoy seguro de entender tu consulta. \n\nPodés preguntarme:\n• "¿Cómo estará mañana en Las Lajitas?"\n• "¿Puedo volar hoy?"\n• "Pronóstico en Metán"\n• "¿Qué coadyuvante uso?"\n• "Condiciones de viento"\n• Servicios, flota, contacto\n\nO usá las sugerencias rápidas 👇`;
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const delay = 500 + Math.random() * 700;
    setTimeout(() => {
      const response = generateResponse(text);
      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'bot',
        text: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, delay);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[100] w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-2xl shadow-yellow-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-7 h-7" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <Bot className="w-7 h-7" />
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-yellow-500"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-4 left-4 sm:right-6 sm:left-auto z-[99] w-full sm:w-[360px] max-h-[70vh] bg-surface-container/95 backdrop-blur-xl rounded-2xl border border-outline-variant/20 shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-b border-outline-variant/15 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/20 flex-shrink-0">
                <Bot className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1 sm:gap-1.5">
                  AeroBot
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                </h3>
                <span className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  En línea — Asistente técnico
                </span>
              </div>
              <button
                onClick={() => {
                  setMessages([]);
                  setTimeout(() => {
                    setMessages([
                      {
                        id: Date.now(),
                        role: 'bot',
                        text: '¡Hola! Soy AeroBot, asistente oficial de **Aero Soluciones**. 🛩️\n\nPuedo decirte cómo estará el clima HOY o MAÑANA en cualquier localidad de nuestra zona de operación.\n\nProbá preguntarme:\n• "¿Cómo estará mañana en Las Lajitas?"\n• "¿Puedo volar pasado mañana en Metán?"\n• "Condiciones de viento en Charata"',
                        timestamp: new Date(),
                      },
                    ]);
                  }, 100);
                }}
                className="text-[10px] text-on-surface-variant/50 hover:text-white transition-colors uppercase tracking-wider font-bold"
              >
                Limpiar
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-[200px] sm:min-h-[300px] max-h-[50vh] scrollbar-thin">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black rounded-br-md font-medium'
                        : 'bg-surface-base/60 text-on-surface border border-outline-variant/10 rounded-bl-md'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-surface-base/60 border border-outline-variant/10 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-yellow-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            {messages.length <= 2 && (
              <div className="px-3 sm:px-4 pb-2">
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      onClick={() => sendMessage(reply)}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-surface-base/40 border border-outline-variant/15 text-[9px] sm:text-[10px] font-bold text-on-surface-variant hover:border-yellow-400/40 hover:text-yellow-400 transition-all active:scale-95"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-outline-variant/15 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribí tu consulta..."
                className="flex-1 bg-surface-base/50 border border-outline-variant/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-yellow-400/50 outline-none transition-all placeholder:text-on-surface-variant/30"
              />
              <motion.button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 text-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default function App() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const forecasts = weatherData ? generateForecasts(weatherData) : [];

  return (
    <WeatherContext.Provider value={weatherData}>
      <ForecastContext.Provider value={forecasts}>
        <div className="font-sans antialiased bg-surface-base text-on-surface selection:bg-secondary-container selection:text-on-secondary-container">
          <Navbar />
          <main>
            <Hero />
            <Services />
            <ParallaxTransition />
            <ParallaxSection />
            <FleetHighlight />
            <CompromisoYEquipo />
            <AgroWeatherMonitor onWeatherUpdate={setWeatherData} />
            <Stats />
            <Contact />
          </main>
          <Footer />
          <AeroBot />
        </div>
      </ForecastContext.Provider>
    </WeatherContext.Provider>
  );
}
