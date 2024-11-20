/* --sql-formatter-disable */
-- .read scripts/user.sql
begin transaction;

pragma foreign_keys = on;

create table if not exists users (
    user_id integer primary key,
    email text not null,
    name text
);

create table if not exists role (
  role_id text primary key
);

create table if not exists user_to_roles (
  user_id integer,
  role_id text,
  primary key (user_id, role_id),
  foreign key (user_id) references User (user_id) on delete cascade,
  foreign key (role_id) references Role (role_id) on delete cascade
);

insert into role (role_id) values ('admin'), ('customer');
insert into users (email, name) values ('user1@example.com', 'user 1');
insert into user_to_roles (user_id, role_id) values (1, 'admin');
insert into user_to_roles (user_id, role_id) values (1, 'customer');

select * from users
inner join user_to_roles on users.user_id = user_to_roles.user_id;

select json_object('userId', user_id, 'email', email, 'name', name,
'roles',  (select json_group_array(role_id) from user_to_roles where user_id = u.user_id)) as data from users u;

rollback;