/* --sql-formatter-disable */
-- .read scripts/child.sql
begin transaction;

pragma foreign_keys = on;

create table grandparent (id integer primary key);

create table parent (
  id integer primary key,
  grandparent_id integer not null,
  foreign key (grandparent_id) references grandparent (id) on update no action on delete cascade
);

create table child (
  id integer primary key,
  parent_id integer not null,
  name text not null,
  foreign key (parent_id) references parent (id) on update no action on delete cascade
);

insert into
  grandparent (id)
values
  (1);

insert into
  parent (id, grandparent_id)
values
  (1, 1);

insert into
  child (id, parent_id, name)
values
  (1, 1, 'John');

update child
set
  name = 'Jas'
where
  id = 1
  and exists (
    select
      1
    from
      parent
    where
      parent.id = child.parent_id
      and parent.grandparent_id = 1
  );

select * from child;

rollback;