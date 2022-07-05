const minitab = () => {
    let job = user.job;
    let part = job.part;
    let mfg = part.mfgs.mfg;
    let lot = part.lots.mfg;
    let op = user.op;
    
    let table = [];
    for (let i in mfg.dims) {
        
        for (let j in lot.samples) {
            
        }
    }
    for (let sample of lot.samples) {
        let row = [
            job.get["Number"],
            part.get["PartNumber"],
            job.customer.get["Name"],
            op.get["Code"]
        ];
        for (let dim of sample.dims) {
            
        }
    }
}