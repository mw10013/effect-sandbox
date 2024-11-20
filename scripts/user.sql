/* --sql-formatter-disable */
-- .read scripts/user.sql
begin transaction;

pragma foreign_keys = on;

create table if not exists user (
    userId integer primary key,
    email text not null,
    name text
);

create table if not exists role (
  roleId text primary key
);

create table if not exists UserToRole (
  userId integer,
  roleId text,
  primary key (userId, roleId),
  foreign key (userId) references User (userId) on delete cascade,
  foreign key (roleId) references Role (roleId) on delete cascade
);

insert into role (roleId) values ('admin'), ('customer');
insert into user (email, name) values ('user1@example.com', 'user 1');
insert into userToRole (userId, roleId) values (1, 'admin');
insert into userToRole (userId, roleId) values (1, 'customer');

select * from user
inner join userToRole on user.userId = userToRole.userId;

select *, (select json_group_array(roleId) from userToRole where userId = u.userId) as roles from user u;
select *, (select json_group_array(roleId) from userToRole where userId = 2) as roles from user u;
select json_object('userId', userId, 'email', email, 'name', name) as data, (select json_group_array(roleId) from userToRole where userId = 2) as roles from user u;
select json_object('userId', userId, 'email', email, 'name', name,
'roles',  (select json_group_array(roleId) from userToRole where userId = u.userId)) as data from user u;

rollback;