import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const emails = ['artisan@tes.com', 'artisan@test.com']
  
  for (const email of emails) {
    console.log(`--- Email: ${email} ---`)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        _count: {
          select: { projectRecipients: true }
        }
      }
    })
    
    if (!user) {
      console.log('User not found.')
      continue;
    }
    
    console.log(`ID: ${user.id}`)
    console.log(`Role: ${user.role}`)
    console.log(`Trade: ${user.trade}`)
    console.log(`Number of projectRecipients: ${user._count.projectRecipients}`)
    
    // 3 latest projectRecipients
    const latestRecipients = await prisma.projectRecipient.findMany({
      where: { professionalId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        project: {
          select: { name: true }
        }
      }
    })
    
    console.log('3 latest requests:')
    if (latestRecipients.length === 0) {
      console.log(' No requests found.')
    } else {
      latestRecipients.forEach((pr, index) => {
        console.log(` ${index + 1}. Project Name: ${pr.project?.name || 'N/A'}`)
        console.log(`    Trade: ${pr.trade}`)
        console.log(`    Status: ${pr.status}`)
        console.log(`    Created At: ${pr.createdAt}`)
      })
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
