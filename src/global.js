import ColonyEndpoint from './colonies/colonies.js'

export let global = {
    colonyName: "",
    colonyPrvKey: "",
    executorId: "",
    executorPrvKey: "",
    serverId: "",
    serverPrvKey: "",
    host: "",
    port: "443",
    tls: "true",
    username: "",
    firstname: "",
    lastlame: "",
    email: "",
    awsS3Endpoint: "",
    awsS3Accesskey: "",
    awsS3Secretkey: "",
    awsS3Region: "",
    awsS3Bucket: "",
    awsS3TLS: "",
    awsS3SkipVerify: "",
    colonies: null,
};

global.colonies = new ColonyEndpoint(global.host, global.port)
