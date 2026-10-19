import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, randomInt } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
export class DrawStore {
  constructor(file, clock = Date.now) {
    this.clock = clock;
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), deadline TEXT, budget INTEGER, drawn INTEGER DEFAULT 0);
      INSERT OR IGNORE INTO settings(id) VALUES(1);
      CREATE TABLE IF NOT EXISTS people (id INTEGER PRIMARY KEY, name TEXT NOT NULL, token TEXT UNIQUE NOT NULL, recipient INTEGER REFERENCES people(id));`);
    if (!this.db.prepare('PRAGMA table_info(people)').all().some(column => column.name === 'created_at')) {
      this.db.exec('ALTER TABLE people ADD COLUMN created_at TEXT');
    }
  }
  config() { return this.db.prepare('SELECT deadline,budget,drawn FROM settings WHERE id=1').get(); }
  configure(deadline, budget) {
    if (!Number.isFinite(Date.parse(deadline)) || Date.parse(deadline) <= this.clock()) throw new Error('Gelecekte bir kapanış tarihi seçin.');
    if (!Number.isSafeInteger(budget) || budget < 1 || budget > 1000000) throw new Error('Bütçe 1 ile 1.000.000 TL arasında olmalı.');
    const config = this.config();
    if (config.drawn || (config.deadline && Date.parse(config.deadline) <= this.clock())) throw new Error('Kapanmış çekilişin ayarları değiştirilemez.');
    this.db.prepare('UPDATE settings SET deadline=?,budget=? WHERE id=1').run(new Date(deadline).toISOString(), budget);
  }
  reopen(deadline, budget) {
    if (!Number.isFinite(Date.parse(deadline)) || Date.parse(deadline) <= this.clock()) throw new Error('Gelecekte bir kapanış tarihi seçin.');
    if (!Number.isSafeInteger(budget) || budget < 1 || budget > 1000000) throw new Error('Bütçe 1 ile 1.000.000 TL arasında olmalı.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.exec('UPDATE people SET recipient=NULL');
      this.db.prepare('UPDATE settings SET deadline=?,budget=?,drawn=0 WHERE id=1').run(new Date(deadline).toISOString(),budget);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.status();
  }
  register(name) {
    const config = this.config();
    if (!config.deadline) throw new Error('Organizatör henüz çekiliş tarihini belirlemedi.');
    if (Date.parse(config.deadline) <= this.clock()) throw new Error('Kayıt süresi sona erdi.');
    if (typeof name !== 'string') throw new Error('Adınızı ve soyadınızı yazın.');
    name = name.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 80 || /[\u0000-\u001f]/.test(name)) throw new Error('İsim 2–80 karakter olmalı.');
    const existing = this.db.prepare('SELECT name FROM people').all();
    if (existing.some(p => p.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'))) throw new Error('Bu isim zaten kayıtlı. Aynı isimdeyseniz ayırt edici bir ek kullanın.');
    const token = randomBytes(32).toString('base64url');
    this.db.prepare('INSERT INTO people(name,token,created_at) VALUES(?,?,?)').run(name, hash(token),new Date(this.clock()).toISOString());
    return token;
  }
  drawIfDue() {
    const config = this.config();
    if (!config.deadline || config.drawn || this.clock() < Date.parse(config.deadline)) return;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!this.config().drawn) {
        const people = this.db.prepare('SELECT id FROM people').all();
        if (people.length < 2) { this.db.exec('COMMIT'); return; }
        // Uniformly sample permutations until nobody draws themselves.
        const recipients = people.map(p => p.id);
        do {
          for (let i = recipients.length - 1; i > 0; i--) {
            const j = randomInt(i + 1);
            [recipients[i], recipients[j]] = [recipients[j], recipients[i]];
          }
        } while (people.some((p, i) => p.id === recipients[i]));
        const update = this.db.prepare('UPDATE people SET recipient=? WHERE id=?');
        people.forEach((p, i) => update.run(recipients[i], p.id));
        this.db.prepare('UPDATE settings SET drawn=1 WHERE id=1').run();
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  status() {
    this.drawIfDue();
    const config = this.config();
    return { ...config, drawn: !!config.drawn, count: this.db.prepare('SELECT COUNT(*) AS n FROM people').get().n, serverTime: this.clock() };
  }
  result(token) {
    this.drawIfDue();
    const person = this.db.prepare('SELECT p.name,r.name AS recipient FROM people p LEFT JOIN people r ON r.id=p.recipient WHERE p.token=?').get(hash(token));
    if (!person) throw new Error('Kişisel bağlantı geçersiz.');
    return { name: person.name, recipient: person.recipient ?? null };
  }
  participants() {
    this.drawIfDue();
    const config = this.config();
    return {
      participants:this.db.prepare('SELECT id,name,created_at FROM people ORDER BY id').all(),
      canDelete:!config.drawn && (!config.deadline || Date.parse(config.deadline)>this.clock())
    };
  }
  deleteRegistration(id) {
    const config = this.config();
    if (config.drawn || (config.deadline && Date.parse(config.deadline)<=this.clock())) throw new Error('Kayıtlar kapandıktan sonra silme yapılamaz.');
    if (!Number.isSafeInteger(id) || id<1) throw new Error('Kayıt bulunamadı.');
    if (!this.db.prepare('DELETE FROM people WHERE id=?').run(id).changes) throw new Error('Kayıt bulunamadı.');
    return this.participants();
  }
  close() { this.db.close(); }
}
