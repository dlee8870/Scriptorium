import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash(
        process.env.SEED_USER_PASSWORD || 'change-me-in-production',
        Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
    );

    const user = await prisma.user.upsert({
        where: { email: 'sampleuser@example.com' },
        update: {},
        create: {
            email: 'sampleuser@example.com',
            passwordHash,
            firstName: 'John',
            lastName: 'Doe',
            avatar: '/uploads/default.png',
            phoneNumber: '123-456-7890',
            role: 'USER',
        },
    });

    const templates = [
        {
            title: 'Sample Python Template',
            language: 'python',
            code: 'print("Hello, World!")',
            explanation: 'This is a simple Python hello world template.',
            tag: 'Python',
        },
        {
            title: 'Sample JavaScript Template',
            language: 'javascript',
            code: 'console.log("Hello, World!")',
            explanation: 'This is a simple JavaScript hello world template.',
            tag: 'JavaScript',
        },
        {
            title: 'Sample Java Template',
            language: 'java',
            code: 'public class Main { public static void main(String[] args) { System.out.println("Hello, World!"); } }',
            explanation: 'This is a simple Java hello world template.',
            tag: 'Java',
        },
    ];

    for (const template of templates) {
        const existing = await prisma.template.findFirst({
            where: { title: template.title, userId: user.id },
        });

        if (!existing) {
            await prisma.template.create({
                data: {
                    title: template.title,
                    language: template.language,
                    code: template.code,
                    explanation: template.explanation,
                    userId: user.id,
                    tags: {
                        connectOrCreate: {
                            where: { name: template.tag },
                            create: { name: template.tag },
                        },
                    },
                },
            });
        }
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
