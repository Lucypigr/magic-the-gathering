import { useState } from 'react';
import type { Screen } from '../App';
import { copySlot, createSlot, deleteSlot, listSlots, renameSlot, switchSlot, type Profile } from '../meta/profile';
import { Gold } from './common';
import { TopBar } from './Home';

function when(t: number): string {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 存檔管理：建立、切換、重新命名、複製與刪除存檔 */
export function Saves({ profile, go, onLoad }: { profile: Profile; go: (s: Screen) => void; onLoad: (p: Profile) => void }) {
  const [, refresh] = useState(0);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const { active, slots } = listSlots();
  const redraw = () => refresh((n) => n + 1);

  return (
    <div className="page">
      <TopBar profile={profile} go={go} title="存檔管理" />
      <section className="panel">
        <h3 className="section-title">我的存檔</h3>
        <p className="muted small">每個存檔都有自己的金幣、收藏、套牌、戰績與天梯段位，可以用不同存檔玩不同的套牌路線。</p>
        <ul className="save-list">
          {slots.map((s) => (
            <li key={s.id} className={s.id === active ? 'on' : ''}>
              <div className="save-main">
                {editing === s.id ? (
                  <form
                    className="save-rename"
                    onSubmit={(e) => {
                      e.preventDefault();
                      renameSlot(s.id, editName);
                      setEditing(null);
                      redraw();
                    }}
                  >
                    <input autoFocus value={editName} maxLength={24} onChange={(e) => setEditName(e.target.value)} aria-label="存檔名稱" />
                    <button className="btn btn-small btn-primary" type="submit">
                      確定
                    </button>
                    <button className="btn btn-small" type="button" onClick={() => setEditing(null)}>
                      取消
                    </button>
                  </form>
                ) : (
                  <div className="save-name">
                    {s.name}
                    {s.id === active && <span className="save-tag">使用中</span>}
                  </div>
                )}
                <div className="save-meta">
                  <Gold n={s.gold} /> · 收藏 {s.cards} 張 · {s.decks} 副套牌 · {s.wins} 勝
                </div>
                <div className="save-time muted small">最後遊玩：{when(s.updated)}</div>
              </div>
              <div className="save-actions">
                {s.id !== active && (
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => {
                      onLoad(switchSlot(s.id));
                      redraw();
                    }}
                  >
                    切換到這個存檔
                  </button>
                )}
                <button
                  className="btn btn-small"
                  onClick={() => {
                    setEditing(s.id);
                    setEditName(s.name);
                  }}
                >
                  重新命名
                </button>
                <button
                  className="btn btn-small"
                  onClick={() => {
                    copySlot(s.id, `${s.name}（複製）`);
                    redraw();
                  }}
                >
                  複製
                </button>
                {slots.length > 1 &&
                  (confirmDel === s.id ? (
                    <>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => {
                          const p = deleteSlot(s.id);
                          if (p) onLoad(p);
                          setConfirmDel(null);
                          redraw();
                        }}
                      >
                        確定刪除
                      </button>
                      <button className="btn btn-small" onClick={() => setConfirmDel(null)}>
                        取消
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-small" onClick={() => setConfirmDel(s.id)}>
                      刪除
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h3 className="section-title">建立新存檔</h3>
        <p className="muted small">新存檔會從頭開始：300 金幣與四套入門套牌。目前的存檔會保留，隨時可以切換回來。</p>
        <form
          className="save-new"
          onSubmit={(e) => {
            e.preventDefault();
            onLoad(createSlot(newName || `存檔 ${slots.length + 1}`));
            setNewName('');
            redraw();
          }}
        >
          <input value={newName} maxLength={24} placeholder={`存檔 ${slots.length + 1}`} onChange={(e) => setNewName(e.target.value)} aria-label="新存檔名稱" />
          <button className="btn btn-primary" type="submit">
            建立並開始
          </button>
        </form>
      </section>
      <div className="setup-go">
        <button className="btn" onClick={() => go({ name: 'home' })}>
          返回主選單
        </button>
      </div>
    </div>
  );
}
