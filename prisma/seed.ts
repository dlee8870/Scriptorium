// prisma/seed.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Create a sample user (you can change the details as needed)
    const user = await prisma.user.create({
        data: {
            email: 'sampleuser@example.com',
            passwordHash: 'hashedPassword123', // You should hash the password using bcrypt in a real app
            firstName: 'John',
            lastName: 'Doe',
            avatar: '/uploads/default.png',
            phoneNumber: '123-456-7890',
            role: 'USER',
        },
    });

    // Create a few sample templates
    await prisma.template.createMany({
        data: [
            {
                title: 'Sample Python Template',
                code: 'print("Hello, World!")',
                explanation: 'This is a simple Python hello world template.',
                userId: user.id,
            },
            {
                title: 'Sample JavaScript Template',
                code: 'console.log("Hello, World!")',
                explanation: 'This is a simple JavaScript hello world template.',
                userId: user.id,
            },
            {
                title: 'Sample Java Template',
                code: 'public class Main { public static void main(String[] args) { System.out.println("Hello, World!"); } }',
                explanation: 'This is a simple Java hello world template.',
                userId: user.id,
            },
        ],
    });

    // Create some tags and link them to templates (optional)
    const pythonTag = await prisma.tag.create({
        data: { name: 'Python' },
    });

    const jsTag = await prisma.tag.create({
        data: { name: 'JavaScript' },
    });

    await prisma.template.update({
        where: { id: 1 },
        data: {
            tags: {
                connect: { id: pythonTag.id },
            },
        },
    });

    await prisma.template.update({
        where: { id: 2 },
        data: {
            tags: {
                connect: { id: jsTag.id },
            },
        },
    });
}

main()
    .catch((e) => {
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
