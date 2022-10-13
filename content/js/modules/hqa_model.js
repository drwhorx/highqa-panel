const user = {
    job: {},
    op: {}
}

const raw = {
    contacts: [],
    companies: [],

    jobs: [],
    parts: [],
    mfgs: [],
    ops: [],
    dims: [],
    drawings: [],
    lots: [],
    samples: [],
    holders: [],
    results: [],
    serials: []
}

const model = {
    contact: {},
    company: {},

    job: {},
    part: {},
    mfg: {},
    op: {},
    dim: {},
    drawing: {},
    file: {},
    lot: {},
    sample: {},
    holder: {},
    result: {},
    serial: {}
}

const models = {
    contact: (init) => ({
        get: init,
    }),
    company: (init) => ({
        get: init,
    }),

    job: (init) => ({
        get: init,

        part: {},
        lots: {
            fpi: {},
            mfg: {},
            sns: {}
        },

        customer: {},
    }),
    part: (init) => ({
        get: init,
        job: {},

        mfgs: {
            mfg: {},
            fin: {}
        },
        ops: [],

        customer: {},
    }),
    mfg: (init) => ({
        get: init,
        part: {},

        dims: [],
        holders: [],
        results: []
    }),
    op: (init) => ({
        get: init,
        part: {},

        dims: []
    }),
    dim: (init) => ({
        get: init,
        part: {},
        mfg: {},

        holders: [],
        results: [],

        op: {},
    }),
    drawing: (init) => ({
        get: init,
        part: {},
        
        file: {}
    }),
    file: (init) => ({
        get: init,
        
        drawings: []
    }),
    lot: (init) => ({
        get: init,
        job: {},

        samples: [],
        holders: [],
        results: []
    }),
    sample: (init) => ({
        get: init,
        lot: {},

        holders: [],
        results: [],
    }),
    holder: (init) => ({
        get: init,
        mfg: {},
        dim: {},
        lot: {},
        sample: {},
    }),
    result: (init) => ({
        get: init,
        mfg: {},
        dim: {},
        lot: {},
        sample: {},

        inspector: {}
    }),
    ncr: (init) => ({
        get: init,
        result: {}
    })
}