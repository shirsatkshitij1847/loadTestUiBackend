import result from './result_4_worker.json' with { type: 'json' };

// console.log(result);

// const summary = result.summary;

// console.log(summary);

// const stepSummary = result.stepSummary;

// console.log(stepSummary);

const virtualUsers =result.virtualUsers

console.log(virtualUsers);

virtualUsers.map((itr)=>{
    console.log(itr.vuId);
    console.log(itr.steps);
    
})
