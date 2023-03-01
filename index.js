const dotenv = require('dotenv')
const axios = require('axios')
const web3 = require('web3')

dotenv.config()

const webhookMap = {
    'aave': process.env.SLACK_AAVE_WEBHOOK,
    'compound': process.env.SLACK_COMPOUND_WEBHOOK,
    'uniswap': process.env.SLACK_UNISWAP_WEBHOOK,
    'euler': process.env.SLACK_EULER_WEBHOOK,
    'main': process.env.SLACK_MAIN_WEBHOOK,
    'proposal-notifs': process.env.SLACK_PROPOSAL_NOTIFS_WEBHOOK
}

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
    const response = await axios.get(process.env.PROP_API, {
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
    return proposals;
}

function createMessage(proposals, firstLine="") {
    message = firstLine;
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
    let props = await getProposals();
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    today = mm + '/' + dd

    //Create a message for the main channel that gives today's date and how many votes are due today.

    let dueToday = props.filter(p => p.remainingTime < 86400);
    let mainMessage = "Good Afternoon! We have " + dueToday.length + " proposal votes that are ending today (" + today + ").\n\n";
    mainMessage += "AAVE: " + dueToday.filter(p => p.platform == "Aave").length + "\n";
    mainMessage += "Compound: " + dueToday.filter(p => p.platform == "Compound").length + "\n";
    mainMessage += "Uniswap: " + dueToday.filter(p => p.platform == "Uniswap").length + "\n";
    mainMessage += "Euler: " + dueToday.filter(p => p.platform == "Euler").length + "\n";
    
    const mainResponse = await axios.post(webhookMap["main"], {
        text: mainMessage
    });
    console.log("Posted to main channel: " + mainResponse.status);

    //Create a message for each protocol
    for(const [key, value] of Object.entries(webhookMap)) {
        if (key == "proposal-notifs" || key == "main") {
            continue;
        }
        let protocolProps = props.filter(p => p.platform.toLowerCase() == key);
        if(protocolProps.length == 0) {
            continue;
        }
        let message = createMessage(protocolProps, "Hello " + ":" + key + ":" + " team! Here are the props that need review:\n\n");
        console.log(message);
        const response = await axios.post(value, {
            text: message
        });
        console.log("Posted to " + key + " channel: " + response.status);
    }
    let AllProtocolsMessage = createMessage(props);
    const allProtocolsResponse = await axios.post(webhookMap["proposal-notifs"], {
        text: AllProtocolsMessage
    });
    console.log("Posted to proposal-notifs channel: " + allProtocolsResponse.status);
}

let response = postToSlack();
