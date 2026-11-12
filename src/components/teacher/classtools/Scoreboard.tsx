'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Maximize, Minimize, RotateCcw, Trophy, Users } from '../../icons';
import { CustomSelect } from '../../CustomSelect';
import { useDialog } from '../../ConfirmDialog';
import type { ClassStudent } from '../../../lib/teacherData';
import { readJson, today, writeJson } from './storage';
import { useFullscreen } from './useFullscreen';
import s from './ClassTools.module.css';

const TEAM_COLORS = [
  { id: 'coral', name: 'Mercan', background: '#f4c9bc' },
  { id: 'blue', name: 'Mavi', background: '#c5dfee' },
  { id: 'lavender', name: 'Lavanta', background: '#ddd2ee' },
  { id: 'mint', name: 'Nane', background: '#cce3cc' },
  { id: 'gold', name: 'Sarı', background: '#f1dfa6' },
  { id: 'pink', name: 'Pembe', background: '#efd0dc' },
];

type Team = { name: string; score: number; members: string[]; color: string };
type ScoreState = { teams: Team[]; history: Team[][] };

const newTeam = (index: number): Team => ({ name: `Takım ${index + 1}`, score: 0, members: [], color: TEAM_COLORS[index % TEAM_COLORS.length].id });

function readTeams(key: string): Team[] {
  const saved = readJson<unknown>(key, null);
  if (!Array.isArray(saved) || saved.length < 2 || saved.length > 6) return [newTeam(0), newTeam(1)];
  return saved.map((value, index) => {
    const team = value as Partial<Team> | null;
    return {
      name: typeof team?.name === 'string' ? team.name.slice(0, 40) : newTeam(index).name,
      score: typeof team?.score === 'number' && Number.isSafeInteger(team.score) ? team.score : 0,
      members: Array.isArray(team?.members) ? team.members.filter((id): id is string => typeof id === 'string') : [],
      color: TEAM_COLORS.find((color) => color.id === team?.color)?.id || newTeam(index).color,
    };
  });
}

export function Scoreboard({ className, students, loading }: { className: string; students: ClassStudent[]; loading: boolean }) {
  const key = `takim-skor:${className}`;
  const { confirm } = useDialog();
  const [state, setState] = useState<ScoreState>({ teams: [newTeam(0), newTeam(1)], history: [] });
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const { full, toggle: toggleFull } = useFullscreen(stageRef);
  const { teams, history } = state;
  const highest = Math.max(...teams.map((team) => team.score));
  const leaders = teams.filter((team) => team.score === highest);
  const tied = leaders.length === teams.length;
  const byId = new Map(students.map((student) => [student.id, student.name]));

  useEffect(() => {
    const restore = () => {
      setState({ teams: readTeams(key), history: [] });
      setReady(true);
    };
    restore();
  }, [key]);

  useEffect(() => {
    if (ready) writeJson(key, teams);
  }, [key, ready, teams]);

  const change = (update: (previous: Team[]) => Team[]) => {
    setState((previous) => ({ teams: update(previous.teams), history: [...previous.history.slice(-49), previous.teams] }));
  };

  const score = (index: number, delta: number) => {
    change((previous) => previous.map((team, position) => position === index ? { ...team, score: team.score + delta } : team));
    setNotice(`${teams[index].name || `Takım ${index + 1}`} ${delta > 0 ? '1 puan kazandı' : '1 puan kaybetti'}.`);
  };

  const resize = async (value: string) => {
    const count = Number(value);
    if (count === teams.length) return;
    if (count < teams.length && !await confirm({ title: 'Takım sayısını azalt', message: 'Sondaki takımlar ve puanları kaldırılacak. Son işlemi geri alabilirsiniz.', confirmText: 'Azalt', cancelText: 'Vazgeç' })) return;
    change((previous) => Array.from({ length: count }, (_, index) => previous[index] || newTeam(index)));
    setNotice(`${count} takım hazır.`);
  };

  const reset = async () => {
    if (!await confirm({ title: 'Puanları sıfırla', message: 'Bütün takımların puanları sıfırlansın mı? Takım adları ve üyeleri korunur.', confirmText: 'Sıfırla', cancelText: 'Vazgeç' })) return;
    change((previous) => previous.map((team) => ({ ...team, score: 0 })));
    setNotice('Bütün puanlar sıfırlandı.');
  };

  const importGroups = async () => {
    const saved = readJson<unknown>(`gruplar:${className}:${today()}`, []);
    const groups = Array.isArray(saved) ? saved.filter(Array.isArray).map((group) => [...new Set(group.filter((id): id is string => typeof id === 'string' && byId.has(id)))]).filter((group) => group.length) : [];
    if (groups.length < 2 || groups.length > 6) {
      setNotice('Aktarmak için Grup oluştur aracında bu sınıfa ait 2–6 grup hazırlayın.');
      return;
    }
    if (!await confirm({ title: 'Grupları takımlara aktar', message: 'Bugünkü gruplar takımlara dönüştürülecek ve puanlar sıfırlanacak. Son işlemi geri alabilirsiniz.', confirmText: 'Aktar', cancelText: 'Vazgeç' })) return;
    change(() => groups.map((members, index) => ({ ...newTeam(index), name: `Grup ${index + 1}`, members })));
    setNotice(`${groups.length} grup takımlara aktarıldı.`);
  };

  const undo = () => {
    setState((previous) => previous.history.length ? { teams: previous.history[previous.history.length - 1], history: previous.history.slice(0, -1) } : previous);
    setNotice('Son işlem geri alındı.');
  };

  return (
    <div className={s.layout}>
      <div ref={stageRef} className={`${s.stage} ${s.scoreStage} ${full ? s.full : ''}`}>
        <div className={s.stageTop}>
          <span className={s.counter}>Takım skorları · {teams.length} takım</span>
          <button type="button" className={s.ghost} onClick={toggleFull} aria-label={full ? 'Tam ekrandan çık' : 'Tam ekran'}>
            {full ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}<span>{full ? 'Küçült' : 'Tam ekran'}</span>
          </button>
        </div>
        <div className={s.scoreGrid} data-teams={teams.length}>
          {teams.map((team, index) => (
            <section key={index} className={`${s.scoreTeam} ${!tied && team.score === highest ? s.scoreLeader : ''}`} style={{ '--score-team-bg': TEAM_COLORS.find((color) => color.id === team.color)?.background } as React.CSSProperties} aria-label={team.name || `Takım ${index + 1}`}>
              <h2>{team.name || `Takım ${index + 1}`}</h2>
              <p className={s.scoreRank}>{!tied && team.score === highest ? <><Trophy size={18} aria-hidden="true" />{leaders.length > 1 ? 'Liderliği paylaşıyor' : 'Önde'}</> : ' '}</p>
              <output className={s.scoreNumber} aria-label={`${team.name || `Takım ${index + 1}`} puanı`}>{team.score}</output>
              <div className={s.scoreButtons}>
                <button type="button" onClick={() => score(index, -1)} aria-label={`${team.name || `Takım ${index + 1}`} 1 puan azalt`}>−1</button>
                <button type="button" onClick={() => score(index, 1)} aria-label={`${team.name || `Takım ${index + 1}`} 1 puan ekle`}>+1</button>
              </div>
            </section>
          ))}
        </div>
        <div className={s.scoreFooter}>
          <p className={s.scoreNotice} role="status">{notice || (tied ? 'Puanlar eşit. Yarışmaya başlayabilirsiniz.' : `${leaders.map((team) => team.name).join(', ')} önde.`)}</p>
          <button type="button" className={s.scoreUndo} onClick={undo} disabled={!history.length}><RotateCcw size={18} aria-hidden="true" />Son işlemi geri al</button>
        </div>
      </div>
      <aside className={s.side}>
        <section className={s.panel} aria-labelledby="score-settings-title">
          <h2 id="score-settings-title" className={s.panelTitle}>Yarışma ayarları</h2>
          <div className={s.scoreField}>
            <label htmlFor="score-team-count">Takım sayısı</label>
            <CustomSelect id="score-team-count" value={String(teams.length)} onChange={resize} options={[2, 3, 4, 5, 6].map((count) => ({ value: String(count), label: `${count} takım` }))} />
          </div>
          <div className={s.scoreSettings}>
            {teams.map((team, index) => (
              <div key={index} className={s.scoreField}>
                <label htmlFor={`score-name-${index}`}>Takım {index + 1} adı</label>
                <input id={`score-name-${index}`} value={team.name} maxLength={40} onChange={(event) => {
                  const name = event.target.value;
                  change((previous) => previous.map((item, position) => position === index ? { ...item, name } : item));
                }} />
                <fieldset className={s.scoreColors}>
                  <legend>Takım {index + 1} rengi</legend>
                  <div>
                    {TEAM_COLORS.map((color) => (
                      <button key={color.id} type="button" aria-label={`Takım ${index + 1} için ${color.name}`} aria-pressed={team.color === color.id} title={color.name} style={{ '--score-team-bg': color.background } as React.CSSProperties} onClick={() => change((previous) => previous.map((item, position) => position === index ? { ...item, color: color.id } : item))}>
                        <span>{team.color === color.id && <Check size={16} aria-hidden="true" />}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                {team.members.length > 0 && <p className={s.muted}>{team.members.map((id) => byId.get(id)).filter(Boolean).join(', ') || 'Bu takımın öğrencileri sınıf listesinde bulunamadı.'}</p>}
              </div>
            ))}
          </div>
          <div className={s.scoreSettingsActions}>
            <button type="button" onClick={importGroups} disabled={loading || !className}><Users size={18} aria-hidden="true" />Bugünkü grupları aktar</button>
            <button type="button" onClick={reset} disabled={teams.every((team) => team.score === 0)}><RotateCcw size={18} aria-hidden="true" />Puanları sıfırla</button>
          </div>
          <p className={s.muted}>Takım adları ve puanları bu tarayıcıda sınıfa göre saklanır. Yanlış cevaplarda puan eksiye düşebilir.</p>
        </section>
      </aside>
    </div>
  );
}
