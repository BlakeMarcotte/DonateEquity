export function debugParticipantTasks(tasks: any[]) {
  console.log('=== PARTICIPANT TASKS DEBUG ===')
  console.log('Total tasks:', tasks.length)
  
  // Find Task 4 (Company Info) and Task 5 (Appraiser NDA)
  const task4 = tasks.find(t => t.title?.includes('Upload Company Information'))
  const task5 = tasks.find(t => t.title?.includes('Appraiser: Sign NDA'))
  
  console.log('\n--- Task 4 (Company Info) ---')
  if (task4) {
    console.log('ID:', task4.id)
    console.log('Status:', task4.status)
    console.log('Type:', task4.type)
    console.log('Order:', task4.order)
  } else {
    console.log('NOT FOUND')
  }
  
  console.log('\n--- Task 5 (Appraiser NDA) ---')
  if (task5) {
    console.log('ID:', task5.id)
    console.log('Status:', task5.status)
    console.log('Dependencies:', task5.dependencies)
    console.log('Order:', task5.order)
    
    if (task5.dependencies && task5.dependencies.length > 0) {
      console.log('\n--- Dependency Check ---')
      task5.dependencies.forEach((depId: string) => {
        const depTask = tasks.find(t => t.id === depId)
        console.log(`Dependency ${depId}:`, depTask ? {
          found: true,
          title: depTask.title,
          status: depTask.status
        } : { found: false })
      })
    }
  } else {
    console.log('NOT FOUND')
  }
  
  console.log('\n--- All Task IDs and Statuses ---')
  tasks.forEach(task => {
    console.log(`${task.order}. ${task.id} - ${task.status} - ${task.title}`)
  })
  
  console.log('=== END DEBUG ===')
}