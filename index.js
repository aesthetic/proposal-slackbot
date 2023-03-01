const dotenv = require('dotenv')
const axios = require('axios')
const web3 = require('web3')

dotenv.config()

async function getBlockNumber() {
    var web3Client = await new web3(process.env.ALCHEMY_API);
    var blockNumber = null;
    var count = 0;
    do {
        try {
            var blockNumber = await web3Client.eth.getBlockNumber();
            keepTrying = false;
        } catch {
            console.log("Error fetching block number, retrying after 5 seconds... (%s/5)", count);
            keepTrying = true;
            count++;
            await new Promise(r => setTimeout(r, 5000));
        }
    } while (keepTrying && count < 5);

    return blockNumber;
}

async function getProposals() {
    let blockNumber = await getBlockNumber();
    // Get block from a day ago
    let queryBlock = blockNumber - 7109;
    console.log("Querying block " + queryBlock)
    const response = await axios.get('http://localhost:3000/api/proposal', {
        params: {
            blockNumber: queryBlock
        }
    }).catch(function (error) {
        if (error.response) {
          // Request made and server responded
          console.log(error.response.data);
          console.log(error.response.status);
          console.log(error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          console.log(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log('Error', error.message);
        }
    
      });
    let proposals = response.data.proposals;
    message = ""
    proposals.forEach((p) => {
        var daysLeft = p.remainingTime / 86400;
        var hoursLeft = (daysLeft - Math.floor(daysLeft)) * 24;
        message += (":" + p.platform + ": <" + p.link + "|*Proposal " + p.id + "*> _" + p.state + "_" + " (" + Math.floor(daysLeft) + " Days " + Math.floor(hoursLeft) + " Hours)" +": " + p.title + "\n\n");
    })
    if (message == "") {
        message = "No new proposals!"
    }
    return message;
}

async function postToSlack() {
    console.log("Fetching proposals...")
    let message = await getProposals();
    console.log(message);
    return;
    const response = await axios.post(process.env.SLACK_INCOMING_WEBHOOK, {
            text: message
    });
    console.log(response.status);
}

let response = postToSlack();
