'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize, Mic, Minimize, Square } from '../../icons';
import { CustomSelect } from '../../CustomSelect';
import { useFullscreen } from './useFullscreen';
import s from './ClassTools.module.css';

type AudioSession = {
  context: AudioContext;
  stream?: MediaStream;
  source?: MediaStreamAudioSourceNode;
  analyser?: AnalyserNode;
};

export function SoundLevel() {
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [level, setLevel] = useState(0);
  const [sensitivity, setSensitivity] = useState(1);
  const [threshold, setThreshold] = useState(65);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const sessionRef = useRef<AudioSession | null>(null);
  const requestRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const { full, toggle: toggleFull } = useFullscreen(stageRef);

  const release = useCallback(() => {
    requestRef.current += 1;
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    session?.source?.disconnect();
    session?.analyser?.disconnect();
    if (session) void session.context.close().catch(() => {});
  }, []);

  const stop = useCallback(() => {
    release();
    setRunning(false);
    setPending(false);
    setLevel(0);
  }, [release]);

  useEffect(() => release, [release]);

  const start = async () => {
    if (sessionRef.current) return;
    setError('');
    if (!window.isSecureContext) {
      setError('Mikrofon için siteyi HTTPS üzerinden veya localhost adresinde açın.');
      return;
    }
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!navigator.mediaDevices?.getUserMedia || !AudioCtor) {
      setError('Bu tarayıcı mikrofonla ses ölçümünü desteklemiyor. Güncel bir tarayıcı kullanın.');
      return;
    }
    const request = ++requestRef.current;
    setPending(true);
    try {
      const context = new AudioCtor();
      const session: AudioSession = { context };
      sessionRef.current = session;
      await context.resume();
      if (request !== requestRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      session.stream = stream;
      session.source = context.createMediaStreamSource(stream);
      session.analyser = context.createAnalyser();
      session.analyser.fftSize = 2048;
      session.source.connect(session.analyser);
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          stop();
          setError('Mikrofon bağlantısı kesildi. Mikrofonu kontrol edip yeniden başlatın.');
        };
      });
      setRunning(true);
      setPending(false);
      try {
        const available = await navigator.mediaDevices.enumerateDevices();
        if (request === requestRef.current) setDevices(available.filter((device) => device.kind === 'audioinput'));
      } catch { /* Measurement can continue when device listing is unavailable. */ }
    } catch (cause) {
      if (request !== requestRef.current) return;
      stop();
      const name = cause instanceof DOMException ? cause.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Mikrofon izni verilmedi. Tarayıcının site ayarlarından mikrofon iznini açıp yeniden deneyin.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('Seçilen mikrofon bulunamadı. Başka bir mikrofon seçin veya cihaz bağlantısını kontrol edin.');
      } else {
        setError('Mikrofon açılamadı. Başka uygulamaların mikrofon kullanımını ve cihaz bağlantısını kontrol edip yeniden deneyin.');
      }
    }
  };

  useEffect(() => {
    const analyser = sessionRef.current?.analyser;
    if (!running || !analyser) return;
    const samples = new Float32Array(analyser.fftSize);
    let frame = 0;
    let previous = 0;
    let smoothed = 0;
    const sample = (time: number) => {
      if (time - previous >= 100) {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) sum += value * value;
        const rms = Math.sqrt(sum / samples.length);
        const relative = Math.max(0, Math.min(100, (20 * Math.log10(Math.max(rms * sensitivity, 0.001)) + 60) / 60 * 100));
        smoothed += (relative - smoothed) * 0.4;
        setLevel(Math.round(smoothed));
        previous = time;
      }
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frame);
  }, [running, sensitivity]);

  const loud = running && level >= threshold;
  const status = pending ? 'Mikrofon izni bekleniyor' : running ? (loud ? 'Ses sınırı aşıldı' : 'Ses düzeyi uygun') : 'Mikrofon kapalı';

  return (
    <div className={s.layout}>
      <div ref={stageRef} className={`${s.stage} ${full ? s.full : ''} ${loud ? s.stageWarn : ''}`}>
        <div className={s.stageTop}>
          <span className={s.counter}>Ses seviyesi</span>
          <button type="button" className={s.ghost} onClick={toggleFull} aria-label={full ? 'Tam ekrandan çık' : 'Tam ekran'}>
            {full ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
            <span>{full ? 'Küçült' : 'Tam ekran'}</span>
          </button>
        </div>
        <div className={s.display}>
          <div className={s.soundDisplay}>
            <Mic size={40} aria-hidden="true" />
            <div className={s.soundValue}>{running ? level : '—'}<span> / 100</span></div>
            <div className={s.soundMeter} role="meter" aria-label="Göreli ses düzeyi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level} aria-valuetext={running ? `${level} / 100` : 'Mikrofon kapalı'}>
              <div className={s.soundFill} style={{ width: `${level}%` }} />
              <span className={s.soundThreshold} style={{ left: `${threshold}%` }} />
            </div>
            <p className={s.soundStatus} role="status">{status}</p>
            <p className={s.hint}>Uyarı sınırı {threshold} / 100</p>
          </div>
        </div>
        <div className={s.controls}>
          {running || pending ? (
            <button type="button" className={s.secondary} onClick={stop}><Square size={20} aria-hidden="true" />{pending ? 'Vazgeç' : 'Mikrofonu durdur'}</button>
          ) : (
            <button type="button" className={s.primary} onClick={start}><Mic size={22} aria-hidden="true" />Mikrofonu başlat</button>
          )}
        </div>
        {error && <p className={s.soundError} role="alert">{error}</p>}
      </div>
      <aside className={s.side}>
        <section className={s.panel} aria-labelledby="sound-settings-title">
          <h2 id="sound-settings-title" className={s.panelTitle}>Mikrofon ve ölçüm</h2>
          <div className={s.soundField}>
            <label htmlFor="sound-device">Mikrofon</label>
            <CustomSelect id="sound-device" value={deviceId} disabled={pending} onChange={(value) => { stop(); setDeviceId(value); setError(''); }} options={[
              { value: '', label: 'Varsayılan mikrofon' },
              ...devices.filter((device) => device.deviceId && device.deviceId !== 'default').map((device, index) => ({ value: device.deviceId, label: device.label || `Mikrofon ${index + 1}` })),
            ]} />
          </div>
          <p className={s.muted}>Mikrofon seçenekleri izin verdikten sonra görünür. Mikrofon değiştirince ölçümü yeniden başlatın.</p>
          <div className={s.soundField}>
            <label htmlFor="sound-sensitivity">Hassasiyet <span>{sensitivity.toFixed(1)}×</span></label>
            <input id="sound-sensitivity" type="range" min="0.5" max="3" step="0.1" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} />
          </div>
          <div className={s.soundField}>
            <label htmlFor="sound-threshold">Uyarı sınırı <span>{threshold} / 100</span></label>
            <input id="sound-threshold" type="range" min="10" max="95" step="1" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />
          </div>
          <p className={s.muted}>Sınıfın normal sesinde ölçümü başlatıp uyarı sınırını ayarlayın. Gösterge mikrofonunuza bağlı göreli bir ölçektir. Kalibre edilmiş desibel (dB) ölçümü yapmaz.</p>
          <p className={s.muted}>Ses yalnızca bu cihazda anlık analiz edilir. Kaydedilmez ve sunucuya gönderilmez. Araçtan çıkınca mikrofon kapanır.</p>
        </section>
      </aside>
    </div>
  );
}
