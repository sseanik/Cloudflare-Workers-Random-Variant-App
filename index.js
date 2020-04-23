// Cloudflare Workers Internship Project
// By Sean Smith
// 23/04/2020

// Event Listner that listens for fetch events
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
})

// Element handler that edits an element's text
class TitleRewriter {
  constructor(attributeName) {
    this.attributeName = attributeName;
  }
  element(element) {
    element.setInnerContent(this.attributeName);
  }
}

// Element handler that changes an element's attribute
class AttributeRewriter {
  constructor(attributeName) {
    this.attributeName = attributeName;
  }
  element(element) {
    element.setAttribute('href', this.attributeName);
  }
}

// Element handler that alters an element's class
class colourRewriter {
  constructor(attributeName) {
    this.attributeName = attributeName;
  }
  element(element) {
    // Alter the element differently depending on its tag name
    if (element.tagName === "div") {
      if (element.getAttribute('class').includes("inset")) {
        element.setAttribute('class', `absolute inset-0 
          bg-${this.attributeName}-500 opacity-25`);
      } else {
        element.setAttribute('class', `mx-auto flex items-center justify-center 
          h-12 w-12 rounded-full bg-${this.attributeName}-100`);
      }
    } else if (element.tagName === "svg") {
      element.setAttribute('class', `h-6 w-6 text-${this.attributeName}-600`);
    } else {
      element.setAttribute('class', `text-lg leading-6 font-medium 
        text-${this.attributeName}-600`);
    }
  }
}

// HTMLWriter that parses and transforms HTML
async function customisePage(response, colour) {
  return await new HTMLRewriter()
    .on('title', new TitleRewriter('Favourite Colour Picker'))
    .on('h1#title', new TitleRewriter(`${colour} Variant`))
    .on('p#description', new TitleRewriter(`Your new favourite colour is 
      ${colour}!`))
    .on('a#url', new TitleRewriter('To my GitHub'))
    .on('a#url', new AttributeRewriter('https://github.com/sseanik'))
    // Extra colouring for fun
    .on('div[class*="bg-gray"]', new colourRewriter(colour))
    .on('div[class*="bg-green"]', new colourRewriter(colour))
    .on('svg[class*="text-green"]', new colourRewriter(colour))
    .on('h1#title', new colourRewriter(colour))
    .transform(response);
}

// Obtain the index value from a cookie if a valid cookie is present
function getVariantFromCookie(cookie) {
  if (!cookie) {
    return null;
  } else if (cookie.includes('variant=0')) {
    return 0;
  } else if (cookie.includes('variant=1')) {
    return 1;
  } 
  return null;
};

// Create a new cookie that expires in 1 hour
function createCookie(index) {
  let date = new Date(); 
  date.setMinutes(date.getMinutes() + 60);
  return `variant=${index}; Expires=${date};`;
}

// Event Handler that returns a custom request object
async function handleRequest(request) {
  // Obtain the variant urls from the API
  const url = 'https://cfw-takehome.developers.workers.dev/api/variants';
  let response = await fetch(url);
  if (response.status !== 200) {
    return new Response('Failed to obtain Variant URLs', {status: 500});
  }
  const data = await response.json();
  const variants = data.variants;

  // Extract cookie information
  let index = request.headers.get('cookie');
  index = getVariantFromCookie(index);

  // If there is a current variant cookie, persist with variant 
  if (index !== null) {
    response = await fetch(variants[index]);
    if (response.status !== 200) {
      return new Response(`Failed to obtain Variant ${index}`, {status: 500});
    }
  } else {
    // Randomise variant index choice (roughly evenly distributed)
    index = Math.random() < 0.5 ? 0 : 1;
    response = await fetch(variants[index]);
    if (response.status !== 200) {
      return new Response(`Failed to obtain Variant ${index}`, 
        {status: 500});
    }
    // Create a new cookie to persist with variant index
    let cookie = createCookie(index);
    response = new Response(response.body, response);
    response.headers.set('Set-Cookie', cookie);
  }

  // Determine the colour and customise the variant page
  const colour = (index == 0) ? "Indigo" : "Green";
  return customisePage(response, colour);
}

