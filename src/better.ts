import Database from "better-sqlite3"

const db = new Database("foobar.db", { verbose: console.log })
db.pragma("journal_mode = WAL")

db.exec("drop table if exists user")

db.exec(`
  create table if not exists User (
    userId integer primary key,
    email text not null,
    name text
  )
`)

const insertStmt = db.prepare("insert into User (email, name) values (?, ?)")
console.log(insertStmt.run("user1@example.com", "user 1"))
console.log(insertStmt.run("user2@example.com", "User 2"))

const stmt = db.prepare("SELECT * FROM User")
console.log(stmt.all())
db.close()
