table_name,column_name,data_type,is_nullable
sessions,id,uuid,NO
sessions,student_id,uuid,NO
sessions,instructor_id,uuid,NO
sessions,scheduled_date,date,NO
sessions,scheduled_time,time without time zone,NO
sessions,status,text,NO
sessions,student_checked_in_at,timestamp with time zone,YES
sessions,student_checked_in_by,uuid,YES
sessions,instructor_checked_in_at,timestamp with time zone,YES
sessions,instructor_checked_in_by,uuid,YES
sessions,created_at,timestamp with time zone,YES
students,id,uuid,NO
students,full_name,text,NO
students,swim_level,text,YES
students,special_info,text,YES
students,parent_name,text,YES
students,parent_contact,text,YES
students,active,boolean,YES
students,created_by,uuid,YES
students,created_at,timestamp with time zone,YES
students,updated_at,timestamp with time zone,YES
users,id,uuid,NO
users,email,text,NO
users,full_name,text,NO
users,role,text,NO
users,created_at,timestamp with time zone,YES

table_name,column_name,referenced_table,referenced_column
invites,created_by,users,id
notes,author_id,users,id
notes,student_id,students,id
notifications,recipient_id,users,id
notifications,session_id,sessions,id
sessions,instructor_checked_in_by,users,id
sessions,instructor_id,users,id
sessions,student_checked_in_by,users,id
sessions,student_id,students,id
students,created_by,users,id