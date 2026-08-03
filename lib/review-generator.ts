// Combinatorial review-text generator. Seven CONTENT pools (service,
// opening, timeliness, workmanship, pricing, closing, one-liner) supply
// the actual substance of a review; four COSMETIC pools (how clauses are
// joined, capitalization style, whether the closing shows, and whether
// the whole review uses the short one-liner format) only affect
// formatting, never substance. In the short format, only the service and
// one-liner phrase actually render — the other 5 content indices are
// still rolled (for a consistent contentKey shape) but unused.
//
// Every candidate carries a numeric id (for reference/audit) and a
// contentKey — the 7 content-pool indices it was built from. The
// server-side ledger (app/api/claim-review/route.ts) enforces two rules:
// no more than 4 of those 7 phrases may match anything already used, AND
// (as a backstop for the short format, where most content indices go
// unused) the exact rendered text can never repeat either. That's what
// actually guarantees no duplicates AND no near-duplicates — not this
// file, which only supplies candidates and never decides what's "used."
// A candidate only becomes "used" when it's actually copied; regenerating
// without copying never touches the ledger.

export const services = [
  "bathroom renovation",
  "water heater replacement",
  "bathtub replacement",
  "drain cleaning",
  "toilet repair",
  "pipe repair",
  "sump pump installation",
  "faucet installation",
  "sewer line repair",
  "leak repair",
];

// Bare fragment, no leading capital, no trailing period — punctuation and
// capitalization are added by the join variants below. {service} gets
// substituted in. The LAST entry is always the location-mention variant —
// see randomCandidate() for why it's excluded from normal random draws.
const openings = [
  "our old plumber retired so we had to find someone new for a {service}, tried these guys",
  "tried a different plumber first for a {service}, wasnt happy, switched to mr drain plumber and it made a difference",
  "my sister used them for a {service} last year and told me to call when i needed one too",
  "landlord had them come out for a {service} at my rental and i was impressed enough to leave a review",
  "moved into a new place and needed a {service} done, went with mr drain plumber based on a recommendation",
  "had an inspector flag an issue that turned into a {service}, mr drain plumber handled it",
  "second time using mr drain plumber, this time for a {service}, and they were just as good as the first",
  "property manager set us up with mr drain plumber for a {service} and it went smoother than expected",
  "had a {service} that i kept putting off until it finally became a bigger issue, called them in",
  "our water heater died on a random tuesday night and we needed a {service} handled asap",
  "ive used a couple different plumbers over the years but honestly this {service} experience was the best one yet",
  "cant say enough good things about how they handled our {service}",
  "wed been putting off a {service} for months because we dreaded dealing with a plumber, turns out we had nothing to worry about",
  "my husband and i argued for weeks about whether we actually needed a {service} before finally caving and calling someone",
  "after our upstairs neighbors pipe burst we figured we should get a {service} done before the same thing happened to us",
  "we just bought this house and the inspector recommended a {service} pretty quickly after we moved in",
  "my in laws kept telling us to get a {service} done and honestly they were right",
  "theres nothing fun about needing a {service}, but at least the process itself was painless",
  "we noticed some water damage on the ceiling and figured it was time to finally get a {service} sorted out",
  "im not usually the type to leave reviews but the {service} they did for us was worth writing about",
  "we called three different companies for quotes on a {service} before landing on mr drain plumber",
  "after dealing with a leaky situation for way too long we finally bit the bullet and got a {service} done",
  "my parents have used mr drain plumber for years and finally convinced me to call them for a {service}",
  "we were getting ready to sell the house and our realtor suggested we take care of a {service} first",
  "it started as a small issue but eventually turned into a full blown {service}",
  "weve never used a plumber before this and honestly didnt know what to expect going into a {service}",
  "after months of a slow drip we finally called someone about a {service}",
  "my roommate found mr drain plumber online and we booked them for a {service} the same week",
  "we were dreading the cost of a {service} but figured it was time to just deal with it",
  "this whole thing started when we noticed our water bill was way higher than usual, ended up needing a {service}",
  "we host a lot of family gatherings so a {service} had been on our list for a while",
  "my husband tried to fix it himself first before we gave in and called someone for a {service}",
  "wed read good things about mr drain plumber online so we gave them a shot for a {service}",
  "our old house came with some plumbing quirks and eventually we needed a {service} to sort one of them out",
  "a friend of mine swore by mr drain plumber so when we needed a {service} i gave them a call",
  "wed been dealing with a weird noise in the pipes for weeks before finally calling someone about it, ended up needing a {service}",
  "renting out our basement meant we finally had to deal with a {service} wed been avoiding",
  "we werent sure if it was worth calling a plumber for a {service} or just living with it, glad we called",
  "after our home warranty didnt cover the issue we ended up calling mr drain plumber for a {service} ourselves",
  "we noticed the toilet running nonstop and finally got around to calling someone for a {service}",
  "after weeks of low water pressure we decided it was time for a {service}",
  "our contractor recommended mr drain plumber when we needed a {service} during our kitchen remodel",
  "i work from home so scheduling a {service} around my calls was a bit of a puzzle, they made it easy",
  "we smelled something off near the water heater and it turned into a {service} pretty quickly",
  "my elderly mother needed a {service} done and i wanted someone patient and trustworthy for her",
  "we were mid renovation when we realized we needed a {service} done before drywall went up",
  "after the home inspection flagged an issue we called mr drain plumber for a {service}",
  "our basement flooded during a storm and we ended up needing a {service} afterward",
  "i found mr drain plumber on nextdoor after asking neighbors who theyd recommend for a {service}",
  "we run a small business out of our building and needed a {service} done without shutting down for the day",
  "my dad always used a different company but hes retired now, so i called mr drain plumber for a {service}",
  "the noise coming from our pipes at night got so bad we finally called someone about a {service}",
  "we just had a baby and didnt have time to deal with a {service} ourselves, so we called in help",
  "our home warranty company set us up with mr drain plumber for a {service}",
  "i saw their truck around the neighborhood a few times before finally calling them for a {service}",
  "we were hosting thanksgiving and needed a {service} handled before everyone showed up",
  "after getting quotes that felt way too high elsewhere we called mr drain plumber for a {service}",
  "our insurance adjuster recommended a {service} after the water damage claim",
  "i left it too long before finally admitting we needed a {service}",
  "we noticed rust colored water coming out of the tap and that led to a {service}",
  "my brother in law is a contractor and told us to call mr drain plumber for a {service}",
  "we were flipping a house and needed a {service} done quickly to stay on schedule",
  "our downstairs neighbor complained about a leak so we had to get a {service} sorted fast",
  "i tried three other companies before mr drain plumber actually showed up for a {service}",
  "we noticed mold starting near the bathroom and that ended up requiring a {service}",
  "my wife found them on google and we booked a {service} the same afternoon",
  "we were skeptical after a bad experience with another plumber but gave mr drain plumber a shot for a {service}",
  "our property management company hired them for a {service} on our unit",
  "wed been hearing gurgling sounds from the drain for a while before finally calling about a {service}",
  "i wanted a second opinion on a {service} another company quoted way too high for",
  "we noticed the water bill creeping up every month until we finally got a {service} done",
  "our airbnb guests complained about an issue so we needed a {service} handled fast",
  "im pretty handy but this {service} was beyond what i wanted to tackle myself",
  "we were closing on the house in a week and needed a {service} finished before the final walkthrough",
  "my sister in law recommended mr drain plumber after they did a {service} for her",
  "we noticed standing water in the yard and that turned into a bigger {service} than expected",
  "our old pipes finally gave out and we needed a {service} done before winter",
  "i called around at 7am after waking up to a mess and they were the only ones who answered for a {service}",
  "wed just moved from out of state and needed a {service} done, no idea who to trust so we went with reviews",
  "our hoa recommended a few companies for a {service} and mr drain plumber had the best reputation",
  "i work in real estate and refer clients to mr drain plumber all the time, finally needed a {service} myself",
  "we noticed a weird stain spreading on the ceiling below the bathroom, ended up being a {service}",
  "my roommate and i split the cost of a {service} after dealing with the issue for way too long",
  "we were renovating an older home and a {service} came up as part of the process",
  "i called mr drain plumber after seeing their van parked outside a neighbors house doing a {service}",
  "our lease requires us to handle minor repairs so we called mr drain plumber for a {service}",
  "we noticed our water heater making strange noises and that led to a {service}",
  "my father in law swears by mr drain plumber and recommended them for our {service}",
  "wed been meaning to get a {service} done since we moved in two years ago",
  "our building manager called mr drain plumber in for a {service} after multiple units reported issues",
  "i was skeptical of the online reviews at first but the {service} they did proved them right",
  "we noticed water pooling near the foundation and that turned into a {service}",
  "my in laws are picky about who they hire and even they were impressed with the {service}",
  "we were prepping the house to list it and needed a {service} handled before photos",
  "i called mr drain plumber after our usual guy stopped returning calls, needed a {service} done",
  "our kids kept asking why the toilet sounded weird, which is when we finally called about a {service}",
  "we noticed the shower draining slower and slower until it finally needed a {service}",
  "my coworker vouched for mr drain plumber so i called them for a {service} at home",
  "we were dealing with a rental property issue and needed a {service} handled remotely, they made it easy",
  // Location-mention variant — always the last entry, see randomCandidate().
  "called mr drain plumber {area} out for a {service}",
];

// Bare verb phrase, implied subject "they" (added by the join variant).
// The LAST entry is always the location-mention variant.
const timeliness = [
  "showed up right when they said they would",
  "got here earlier than the window they gave me",
  "texted before showing up which i appreciated",
  "were a little late but called ahead to give me a heads up",
  "showed up the same day, didnt have to wait around for once",
  "made it out within a couple hours of calling",
  "were right on time, no complaints there",
  "showed up ready to go, no messing around",
  "called ahead to confirm the time which i wasnt expecting",
  "showed up a bit early actually, which threw me off but in a good way",
  "gave me a heads up text when they were on the way",
  "were flexible when i had to push the appointment back a bit",
  "fit me in same week even though i called kind of last minute",
  "arrived within the window they quoted, no runaround",
  "showed up dressed and ready to work, no wasted time getting started",
  "kept me posted the whole time on when theyd actually get there",
  "called the day before to confirm everything, which i wasnt expecting",
  "showed up in the exact window they promised, not a minute later",
  "were done faster than i thought theyd be",
  "let me know they were running a few minutes behind instead of just showing up late",
  "made time for me even though their schedule looked packed",
  "showed up with everything they needed, no extra trip for parts",
  "got here before i even finished my coffee, earlier than expected",
  "squeezed me in between two other jobs without making me feel like an afterthought",
  "called first thing in the morning to lock in a same day slot",
  "showed up on a weekend without charging some crazy emergency fee",
  "were done and gone before i even had to rearrange my whole day",
  "gave me a two hour window and actually stuck to it",
  "showed up right after a holiday when i figured nobody would be working",
  "responded to my message within minutes, which surprised me",
  "didnt cancel or reschedule on me like the last company did",
  "showed up with a full crew instead of just one guy for a bigger job",
  "confirmed the appointment by text the morning of, small thing but appreciated it",
  "showed up during a snowstorm when i figured theyd push it to another day",
  "were done quicker than the quote estimated",
  "showed up right as they said, no chasing them down for updates",
  "handled the scheduling online which made the whole thing easy",
  "showed up prepared for exactly what i described over the phone, no surprises",
  "made sure to call ahead since i mentioned i had a dog that needed to be put away",
  "showed up exactly when the app said they would",
  "called twice to update me on their eta",
  "showed up before i even had a chance to tidy up",
  "were done in under an hour, way faster than i expected",
  "gave me a heads up the night before to confirm",
  "showed up in a marked van so i knew it was them right away",
  "were super communicative about timing the whole way through",
  "showed up on the dot despite bad traffic that day",
  "rescheduled around my work hours without any hassle",
  "showed up with a smile even though it was pouring rain",
  "let me track their arrival time through a link they sent",
  "showed up right as my lunch break started, perfect timing",
  "were done before my kids even got home from school",
  "showed up early enough that i wasnt even fully ready",
  "called from the driveway to let me know theyd arrived",
  "showed up on a holiday weekend without any extra hassle",
  "were quick to reschedule when i had a last minute conflict",
  "showed up within 20 minutes of the emergency call",
  "gave a realistic timeframe instead of a vague window",
  "showed up right after i hung up the phone, felt like magic",
  "were done and packed up before i finished my coffee",
  "showed up in the middle of a snowstorm without complaint",
  "kept the appointment even though it was late in the evening",
  "showed up on time for a job that was clearly not glamorous",
  "were flexible about moving the appointment when my schedule changed twice",
  "showed up right on the dot, not a minute early or late",
  "called ahead so i could make sure the dog was put away",
  "showed up before the estimated window even started",
  "were quick to accommodate a same day request",
  "showed up with time to spare before my next appointment",
  "gave me updates through text the whole morning",
  "showed up without any of the usual scheduling back and forth",
  "were on site faster than i thought possible for a weekend call",
  "showed up right when i was starting to worry theyd forgotten",
  "made the whole scheduling process painless from start to finish",
  "showed up ready to start immediately, no wasted time",
  "were done before the hour mark they quoted",
  "showed up during a busy week and still made it feel unrushed",
  "gave me plenty of notice before showing up",
  "showed up despite short notice on my end",
  "were prompt even though i booked last minute online",
  "showed up exactly within the promised window, first try",
  "called to check if an earlier slot worked better for me",
  "showed up with everything ready to go, no delays",
  "were quicker to respond than i expected for a weekend",
  "showed up right after the holiday without any extra wait",
  "kept me in the loop the entire time they were en route",
  "showed up on the exact day they said they would, no rescheduling",
  "were efficient about getting started right away",
  "showed up earlier than expected which actually worked out great",
  "gave a heads up call thirty minutes before arriving",
  "showed up on a sunday without charging extra",
  "were done quickly enough that i barely had to rearrange my day",
  "showed up with the whole crew ready to go at once",
  "kept to the schedule even when the job ran a bit long",
  "showed up first thing in the morning as promised",
  "were flexible enough to work around our nap schedule",
  "showed up prepared for a same day emergency",
  "called back within minutes of my initial message",
  "showed up without any surprises about the appointment time",
  // Location-mention variant — always the last entry, see randomCandidate().
  "got here fast, mr drain plumber {area} really came through",
];

const workmanship = [
  "He explained what he was doing before touching anything",
  "The plumber cleaned up so well you'd barely know anyone had been there",
  "He didn't try to upsell us on anything we didn't need",
  "The plumber walked us through the problem before starting",
  "He was straightforward about what needed fixing and what could wait",
  "The plumber double checked everything before calling it done",
  "He explained things in plain language instead of using a bunch of jargon",
  "The guy took his time instead of rushing through it",
  "He showed us photos of the issue before starting the work",
  "The plumber answered every question without acting annoyed",
  "He left the work area cleaner than he found it",
  "The plumber used proper equipment instead of cutting corners",
  "He caught a second issue while he was in there and flagged it right away",
  "The plumber wore shoe covers inside without us asking",
  "He didn't rush even though it was getting late in the day",
  "The guy made sure everything worked properly before packing up",
  "He pointed out a potential problem before it turned into a bigger one",
  "The plumber labeled everything so we knew what was replaced",
  "He tested everything twice before calling the job finished",
  "He brought in a second opinion instead of just guessing",
  "He walked us through basic maintenance so we could avoid the same issue",
  "The plumber took before and after photos without us even asking",
  "He didn't leave until we confirmed everything was working right",
  "The plumber used drop cloths so nothing in the house got messed up",
  "He handled an unexpected complication without making it our problem",
  "The plumber kept the noise down, which we appreciated with the baby sleeping",
  "He matched the existing fixtures instead of installing whatever he had on hand",
  "The guy explained the warranty clearly before he left",
  "He didn't cut corners even on the parts we wouldn't have noticed",
  "The plumber asked before making any changes outside what we'd discussed",
  "He respected the house and took his shoes off without being asked",
  "The plumber showed genuine care about getting it right, not just getting it done",
  "He caught something a previous plumber had completely missed",
  "The plumber left clear instructions in case anything came up again",
  "He handled everything himself instead of subcontracting it out",
  "The guy was patient with our older plumbing instead of pushing a full replacement",
  "He walked around checking for any other potential issues before leaving",
  "The plumber took extra care around our new flooring",
  "He explained the difference between a quick fix and a real long term solution",
  "The plumber made sure the kids and dog stayed safely out of the way",
  "He took the time to explain what actually caused the issue",
  "The plumber was respectful of our home the whole time he was here",
  "He brought extra lighting to get a better look at the problem",
  "The guy consulted a specialist before finalizing the repair",
  "He was thorough checking for leaks in other parts of the house too",
  "The plumber made sure the new fixture actually matched the rest of the bathroom",
  "He was proactive about spotting a problem we hadn't even noticed yet",
  "The plumber was honest that a full replacement wasn't necessary yet",
  "He took the extra step of testing the water temperature before leaving",
  "The plumber checked in with us at each step before moving forward",
  "He was upfront about needing a specialty part and what that meant for timing",
  "The guy handled a tricky access point without any extra fuss",
  "He explained our options clearly instead of pushing one over the other",
  "The plumber went through a full checklist before wrapping up",
  "He was diligent about checking every connection before calling it finished",
  // Location-mention variant — always the last entry, see randomCandidate().
  "The mr drain plumber {area} guy explained everything clearly before starting",
];

const pricing = [
  "The price matched what they quoted over the phone, no surprises",
  "He didn't overcharge us even though the job took longer than expected",
  "The plumber quoted a fair price up front and stuck to it",
  "The cost ended up being reasonable for the work that got done",
  "He gave us the price before starting so there were no surprises later",
  "The plumber charged exactly what he said he would, nothing extra tacked on",
  "The price was fair, we didn't feel ripped off at all",
  "He broke down the cost so we actually understood what we were paying for",
  "The plumber offered a couple options at different price points",
  "The invoice matched the estimate down to the dollar",
  "He didn't charge extra for the after hours call, which we expected he would",
  "The price felt steep at first but made sense once we saw the work involved",
  "He gave us a heads up before any extra cost came up",
  "It ended up cheaper than the last plumber we used for something similar",
  "There were no hidden fees tacked onto the final bill",
  "The final price ended up lower than the original estimate",
  "He didn't nickel and dime us for small stuff along the way",
  "The guy explained why the price was what it was instead of just handing us a number",
  "He offered a senior discount without us even having to ask",
  "The price included a follow up visit, which we weren't expecting",
  "He was upfront that cash or card made no difference in price",
  "The plumber gave us a written quote before starting, not just a verbal one",
  "The price stayed the same even after the job got more complicated than planned",
  "He didn't charge a separate diagnostic fee like some places do",
  "The plumber worked with our budget instead of pushing the priciest option",
  "The price was in line with what we'd already researched online",
  "Parts and labor were clearly broken out on the invoice",
  "He didn't charge extra for the weekend appointment",
  "The plumber gave us financing options when we mentioned the cost was a stretch",
  "The price reflected the quality, not the cheapest option but not overpriced either",
  "He matched a quote we got from another company without us even asking",
  "The guy was clear about the price difference between repair and replacement",
  "He threw in a small extra fix at no charge",
  "The plumber gave us a military discount, which we really appreciated",
  "The price was reasonable considering it was an after hours call",
  "He didn't make us feel weird for asking questions about the invoice",
  "The plumber kept costs down by fixing instead of pushing a full replacement",
  "He gave us a price range up front so there were no surprises later",
  "The invoice was sent digitally which made it easy to keep for our records",
  "He explained each line item so nothing felt like a mystery charge",
  "The plumber held to the original quote even after finding a second issue",
  "He offered a discount for booking more than one service at once",
  "The guy gave a same day estimate before any work even started",
  "He was transparent about the cost of parts versus labor",
  "The plumber didn't pressure us into the most expensive fixture option",
  "The price ended up being fair compared to two other quotes we got",
  "He explained the cost difference between repairing and replacing",
  "The plumber gave us time to think it over before committing to anything",
  "He was upfront that the emergency call would cost a bit more",
  "The plumber broke everything down so we could see exactly what we were paying for",
  "He didn't charge us for the time spent just diagnosing the issue",
  "The guy offered a payment plan when we mentioned it was a stretch",
  "He gave us a ballpark before arriving so there were no surprises",
  "The price matched what a neighbor told us they'd paid for something similar",
  "The plumber was clear that the quote included cleanup and disposal",
  // Location-mention variant — always the last entry, see randomCandidate().
  "Mr. Drain Plumber {area} gave us a fair price and stuck to it",
];

// Full sentences with a real subject, not bare fragments — closings are
// the last thing anyone reads, so this is the one pool where sounding
// like an actual complete sentence (capital "I" and all) matters most.
const closings = [
  "I would highly recommend them to anyone in need of a plumber",
  "I would definitely use them again",
  "Would definitely call them again if anything else comes up",
  "Highly recommend if you're looking for someone reliable",
  "I'm really happy with how everything turned out",
  "I wouldn't hesitate to recommend them to friends or family",
  "Already recommended them to a couple people I know",
  "Can't recommend them enough",
  "They've earned a customer for life",
  "I'll definitely be calling them again for anything else that comes up",
  "Great experience overall, no complaints",
  "This is who I'm calling from now on",
  "Worth every penny for the peace of mind",
  "Glad I found a plumber I can actually trust",
  "They made a stressful situation a lot easier",
  "I was genuinely impressed with how they handled everything",
  "Five stars, would use them again in a heartbeat",
  "Honestly one of the better contractor experiences I've had",
  "No regrets calling them for this",
  "They've got my business going forward",
  "I'll be recommending them to everyone I know",
  "Couldn't be happier with the outcome",
  "They've officially become our first call for anything plumbing related",
  "It's rare to find a company that actually delivers on what they promise",
  "I feel a lot better knowing who to call next time something comes up",
  "They handled everything better than I expected going in",
  "I've already saved their number in my phone",
  "This is exactly the kind of service you hope for and rarely get",
  "They turned a frustrating situation into a pretty painless one",
  "I'm genuinely glad I gave them a call",
  "They've won over a customer for the long run",
  "I have zero hesitation recommending them to anyone",
  "It's nice to deal with a company that actually cares about doing it right",
  "I'll be passing their info along to family",
  "They made the whole process a lot less stressful than I expected",
  "I'd give more than five stars if I could",
  "This won't be the last time I use them",
  "They earned every bit of this review",
  "I'm confident recommending them without any reservations",
  "I've told everyone in our building about them",
  "They're the first name that comes to mind now when anything plumbing related comes up",
  "I felt like a priority the whole time, not just another job",
  "We'll be using them for every plumbing need going forward",
  "I appreciated how straightforward the whole experience was",
  "They restored my faith in hiring contractors",
  "I was skeptical going in but they won me over completely",
  "We've already recommended them to our realtor for future clients",
  "It's rare to feel this good about a home repair experience",
  "They made a homeowner headache feel manageable",
  "I'd give them ten stars if the option existed",
  "We're relieved to have found a plumber we actually trust",
  "They earned a loyal customer today",
  "I can't imagine using anyone else after this",
  "They took what could've been a nightmare and made it painless",
  "We're genuinely grateful for how smoothly everything went",
  "I've already bookmarked their number for next time",
  "They handled everything with a level of professionalism I wasn't expecting",
  "I'm happy to be a repeat customer after this experience",
  "We felt taken care of from the first phone call",
  "They've set the bar high for every contractor after this",
  "I left this review the same day because I was that impressed",
  "We're telling every neighbor who'll listen about them",
  "They made the whole ordeal feel like less of a big deal",
  "I was genuinely surprised by how painless this was",
  "We'll definitely have them back for future projects",
  "They've earned every bit of trust we're putting in them going forward",
  "I appreciated not feeling talked down to during the whole process",
  "We're already planning to use them for a bigger project next year",
  "They turned what I expected to be a hassle into a non issue",
  "I felt like they genuinely cared about getting it right",
  "We couldn't have asked for a smoother experience",
  "They've become the plumber we recommend to literally everyone",
  "I'm impressed enough to be writing my first ever plumber review",
  "We're relieved this is finally behind us, and glad it was with them",
  "They made a stressful week just a little bit easier",
  "I felt genuinely respected as a customer, not just a paycheck",
  "We'll be saving their number for whatever comes up next",
  "They exceeded expectations I honestly didn't have very high to begin with",
  "I'm confident recommending them to anyone who asks",
  "We're happy customers and we don't say that about most contractors",
  "They made the whole thing feel a lot less overwhelming",
  "I appreciated being treated like I actually understood what was going on",
  "We'll be telling our family about this experience for a while",
  "They handled everything the way you'd hope a professional would",
  "I'm glad I finally took the time to leave a review for them",
  "We felt like we were in good hands the entire time",
  "They've earned a permanent spot in our contacts",
  "I walked away from this experience actually impressed, which doesn't happen often",
  "We're grateful to have found them before things got worse",
  "They made the whole process feel refreshingly honest",
  "I'd recommend them without a second thought",
  "We're glad we finally pulled the trigger and called them",
  "They handled our situation better than we expected going in",
  "I felt like a valued customer, not just another appointment on the calendar",
  "We're already telling friends to save their number",
  "They made what felt like a big deal turn into a quick fix",
  "I appreciated the honesty throughout the entire process",
  "We'll happily be repeat customers from here on out",
  "They've made a real believer out of me",
  // Location-mention variant — always the last entry, see randomCandidate().
  "I'll definitely be calling Mr. Drain Plumber {area} again",
];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function uncap(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// Complete, self-contained one-line reviews — used for a minority of
// generations instead of the full multi-clause format, so not every
// review reads like a mini essay. {service} gets substituted in.
const oneLiners = [
  "fast, friendly, and upfront about pricing for our {service}, would use them again",
  "quick and professional {service}, highly recommend",
  "great experience with our {service}, five stars",
  "did our {service} quickly and the price was fair, would call again",
  "solid work on our {service} and fair pricing, no complaints",
  "they handled our {service} fast and did it right, will use them again",
  "really happy with how they handled our {service}, quick and professional",
  "affordable and quick {service}, exactly what we needed",
  "great job on the {service}, fair price and no hassle",
  "they fixed our {service} fast and charged a fair price, would recommend them",
  "efficient, honest, and fairly priced for our {service}",
  "showed up fast, fixed the {service}, fair price too",
  "quick response and quality work on our {service}, thanks",
  "handled our {service} quickly and professionally, would recommend",
  "fair price and fast service on our {service}, very happy",
  "they really helped fast and fixed the {service} issue, appreciate it",
  "wasnt sure what to expect but they nailed the {service}",
  "good communication and solid work on the {service}",
  "prompt, polite, and fairly priced for our {service}",
  "no complaints about the {service}, fast and fair",
  "easy to book, fair price, and the {service} was done right the first time",
  "they showed up quick and knocked out the {service} without any issues",
  "straightforward pricing and quick work on our {service}, would use again",
  "friendly guy, fair price, fixed our {service} fast",
  "cant complain about the {service}, quick, fair, and done right",
];

interface Parts {
  opening: string;
  timeliness: string;
  workmanship: string;
  pricing: string;
  closing: string;
}

// Different ways of stitching the 5 clauses together. These vary the
// ORDER the clauses appear in, not just punctuation — every review
// previously followed the exact same skeleton (opening, then "They
// [timeliness]", then workmanship, then pricing), which reads as
// obviously templated no matter how much the wording underneath varies.
// Moving "They [timeliness]" to a different position each time (or a
// clause other than timeliness leading right after the opening) breaks
// that fixed shape. `showClosing` is threaded through so the closing
// sentence can be dropped entirely (see closingVisibility below) — a
// review that always ends on a tidy wrap-up line reads as formulaic.
// This is cosmetic only: it never changes which phrases were used.
const joinVariants: Array<(p: Parts, showClosing: boolean) => string> = [
  (p, showClosing) =>
    `${cap(p.opening)}. They ${p.timeliness}. ${cap(p.workmanship)}. ${cap(p.pricing)}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}. ${cap(p.workmanship)}. They ${p.timeliness}. ${cap(p.pricing)}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}. ${cap(p.pricing)}. They ${p.timeliness}. ${cap(p.workmanship)}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}. ${cap(p.workmanship)}. ${cap(p.pricing)}. They ${p.timeliness}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}, they ${p.timeliness}. ${cap(p.workmanship)}. ${cap(p.pricing)}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}. Honestly, ${uncap(p.workmanship)}. They ${p.timeliness} too. ${cap(p.pricing)}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}. On top of that, ${uncap(p.pricing)}. ${cap(p.workmanship)}. They ${p.timeliness} as well.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
];

// About 1 in 3 reviews skip the closing sentence entirely — always ending
// on a neat wrap-up line is one of the more obvious "botty" tells.
const closingVisibility: boolean[] = [true, true, false];

// Casual capitalization, sprinkled in rather than baked into every
// review. Weighted so "proper" is overwhelmingly the common case — most
// reviews should read cleanly, only a rare few should look dashed off on
// a phone. NORMAL_WEIGHT normal entries per 1 of each casual variant.
const NORMAL_WEIGHT = 18;
const capitalizationStyles: Array<(text: string) => string> = [
  ...Array.from({ length: NORMAL_WEIGHT }, () => (text: string) => text),
  (text) => text.charAt(0).toLowerCase() + text.slice(1),
  (text) => text.toLowerCase(),
  (text) => sprinkleOneSentenceLower(text),
];

function sprinkleOneSentenceLower(text: string): string {
  const boundaries: number[] = [];
  for (let i = 0; i < text.length - 2; i++) {
    if (text[i] === "." && text[i + 1] === " ") boundaries.push(i + 2);
  }
  if (boundaries.length === 0) {
    return text.charAt(0).toLowerCase() + text.slice(1);
  }
  const pos = boundaries[randInt(boundaries.length)];
  return text.slice(0, pos) + text.charAt(pos).toLowerCase() + text.slice(pos + 1);
}

// Content pools — each index here is one "phrase" for the purposes of
// the 4-matching-phrases rule.
const contentPools = [services, openings, timeliness, workmanship, pricing, closings, oneLiners] as const;
const CONTENT_DIMS = contentPools.map((p) => p.length);

// About 1 in 5 reviews use the short one-liner format instead of the
// full multi-clause one — not every review should read like a mini essay.
const formatChoices = ["long", "long", "long", "long", "short"] as const;

// Cosmetic pools — never count toward phrase-matching.
const cosmeticPools = [joinVariants, capitalizationStyles, closingVisibility, formatChoices] as const;
const COSMETIC_DIMS = cosmeticPools.map((p) => p.length);

const ALL_DIMS = [...CONTENT_DIMS, ...COSMETIC_DIMS];

export const TOTAL_CONTENT_COMBINATIONS = CONTENT_DIMS.reduce((a, b) => a * b, 1);
export const TOTAL_COMBINATIONS = ALL_DIMS.reduce((a, b) => a * b, 1);

export interface ReviewCandidate {
  id: number;
  text: string;
  // The 7 content-pool indices this candidate was built from — sent to
  // the server so it can check phrase overlap against everything
  // already used, in addition to an exact-text check.
  contentKey: number[];
}

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function comboId(indices: number[]): number {
  let id = 0;
  for (let i = 0; i < indices.length; i++) {
    id = id * ALL_DIMS[i] + indices[i];
  }
  return id;
}

function buildText(indices: number[], areaName: string): string {
  const [si, oi, ti, wi, pi, ci, li, ji, capi, cvi, fi] = indices;

  if (formatChoices[fi] === "short") {
    const raw = `${cap(oneLiners[li].replaceAll("{service}", services[si]))}.`;
    return capitalizationStyles[capi](raw);
  }

  const opening = openings[oi]
    .replaceAll("{service}", services[si])
    .replaceAll("{area}", areaName);
  const parts: Parts = {
    opening,
    timeliness: timeliness[ti].replaceAll("{area}", areaName),
    workmanship: workmanship[wi].replaceAll("{area}", areaName),
    pricing: pricing[pi].replaceAll("{area}", areaName),
    closing: closings[ci].replaceAll("{area}", areaName),
  };
  const raw = joinVariants[ji](parts, closingVisibility[cvi]);
  return capitalizationStyles[capi](raw);
}

// One "Mr. Drain Plumber {area}" keyword mention (good for local SEO)
// shows up in roughly 1 in 7 reviews, and never in more than one of the 5
// eligible pools at once — showing it in every pool simultaneously, or
// every review, would read as spammy keyword-stuffing instead of a
// genuine mention. The location-mention variant is always the LAST entry
// in each of openings/timeliness/workmanship/pricing/closings, so normal
// random draws exclude it (`length - 1`) unless this roll specifically
// selects it.
const LOCATION_MENTION_CHANCE = 7;
const LOCATION_ELIGIBLE_SLOTS = 5;

export function randomCandidate(areaName: string): ReviewCandidate {
  const si = randInt(services.length);
  let oi = randInt(openings.length - 1);
  let ti = randInt(timeliness.length - 1);
  let wi = randInt(workmanship.length - 1);
  let pi = randInt(pricing.length - 1);
  let ci = randInt(closings.length - 1);

  let closingHasLocationMention = false;

  if (randInt(LOCATION_MENTION_CHANCE) === 0) {
    switch (randInt(LOCATION_ELIGIBLE_SLOTS)) {
      case 0:
        oi = openings.length - 1;
        break;
      case 1:
        ti = timeliness.length - 1;
        break;
      case 2:
        wi = workmanship.length - 1;
        break;
      case 3:
        pi = pricing.length - 1;
        break;
      default:
        ci = closings.length - 1;
        closingHasLocationMention = true;
        break;
    }
  }

  // Don't let the closing-omission roll silently swallow a location
  // mention that landed in the closing slot — force it visible instead.
  const cvi = closingHasLocationMention
    ? closingVisibility.findIndex((visible) => visible)
    : randInt(closingVisibility.length);

  const li = randInt(oneLiners.length);

  const indices = [
    si,
    oi,
    ti,
    wi,
    pi,
    ci,
    li,
    randInt(joinVariants.length),
    randInt(capitalizationStyles.length),
    cvi,
    randInt(formatChoices.length),
  ];
  const contentKey = indices.slice(0, CONTENT_DIMS.length);
  return { id: comboId(indices), text: buildText(indices, areaName), contentKey };
}
