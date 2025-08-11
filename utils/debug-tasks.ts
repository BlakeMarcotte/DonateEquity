// Debug utility for task dependency issues
export function debugTaskDependencies(tasks: any[]) {
  console.log('=== TASK DEPENDENCY DEBUG ===');
  console.log('Total tasks:', tasks.length);
  
  // Find Task 4 and Task 5
  const task4 = tasks.find(t => t.title?.includes('Upload Company Information'));
  const task5 = tasks.find(t => t.title?.includes('Appraiser: Sign NDA'));
  
  console.log('\nTask 4 (Company Info):', {
    id: task4?.id,
    title: task4?.title,
    status: task4?.status,
    order: task4?.order
  });
  
  console.log('\nTask 5 (Appraiser NDA):', {
    id: task5?.id,
    title: task5?.title,
    status: task5?.status,
    order: task5?.order,
    dependencies: task5?.dependencies,
    blocked: task5?.status === 'blocked'
  });
  
  if (task5?.dependencies) {
    console.log('\nDependency Check:');
    task5.dependencies.forEach((depId: string) => {
      const depTask = tasks.find(t => t.id === depId);
      console.log(`- Dependency ${depId}:`, {
        found: !!depTask,
        status: depTask?.status,
        isTask4: depTask?.id === task4?.id
      });
    });
  }
  
  // Check if dependency IDs match
  if (task4 && task5) {
    const actualDependencies = task5.dependencies || [];
    console.log('\nDependency ID Match:', {
      task4Id: task4.id,
      task5Dependencies: actualDependencies,
      matchFound: actualDependencies.includes(task4.id)
    });
  }
  
  console.log('=== END DEBUG ===');
}