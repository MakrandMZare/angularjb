generate client {
	provider = "prisma-client-js"
}

datasource db {
	provider = "mysql"
	url	 = env("DATABASE_URL")
}

model User {
	id		int		@id @default(autoincrement())
	email		String		@unique
	password	String
	firstName	String?
	lastName	String?
	createdAt	DateTime	@default(now())
}