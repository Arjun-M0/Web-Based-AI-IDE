import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import {db} from "./lib/db";
import authConfig from "./auth.config";
import { getUserById } from "./features/auth/actions";

export const { auth , handlers , signIn , signOut } = NextAuth({
    callbacks: {
        async signIn({user,account}){
            if (!user || !account) return false;

            const existingUser = await db.user.findUnique({
                where: { email: user.email!},
            });

            if (!existingUser) {
                const newUser = await db.user.create({
                    data: {
                        email: user.email!,
                        name: user.name,
                        image: user.image,

                        accounts: {
                            create: {
                                provider: account.provider, 
                                providerAccountId: account.providerAccountId,
                                type: account.type,
                                access_token: account.access_token,
                                token_type: account.token_type,
                                scope: account.scope,
                                id_token: account.id_token,
                                session_state:
                                    typeof account.session_state === "string"
                                        ? account.session_state
                                        : account.session_state == null
                                          ? null
                                          : JSON.stringify(account.session_state),
                                refresh_token: account.refresh_token,
                                expires_at: account.expires_at,
                            },
                        },
                    },
                });

                if(!newUser) return false;
            }

            else {
                const existingAccount = await db.account.findUnique({
                    where: {
                        provider_providerAccountId: {
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                        },
                    },
                });
                if(!existingAccount){
                    await db.account.create({
                        data: {
                            userId: existingUser.id,
                            type: account.type,
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                            access_token: account.access_token,
                            token_type: account.token_type,
                            scope: account.scope,
                            id_token: account.id_token,
                            session_state:
                                typeof account.session_state === "string"
                                    ? account.session_state
                                    : account.session_state == null
                                      ? null
                                      : JSON.stringify(account.session_state),
                            refresh_token: account.refresh_token,
                            expires_at: account.expires_at,
                        },
                    });
                };
            }
            return true;
        } ,

        async jwt({ token }) {
            if (!token.sub) return token;

            const existingUser = await getUserById(token.sub);

            if(!existingUser) return token;

            token.name = existingUser.name;
            token.email = existingUser.email;
            token.role = existingUser.role;

            return token;
        },

        async session({ session, token }) {
            if(token.sub && session.user){
                session.user.id = token.sub;
                session.user.role = token.role;
            }
            return session;
        }
    },
    adapter: PrismaAdapter(db),
    secret: process.env.AUTH_SECRET,
    session: {
        strategy: "jwt",
    },
    ...authConfig
});