import publicData from "./publicData.json";

export const works = publicData.works || [];
export const areas = publicData.areas || [];
export const spots = publicData.spots || [];

export function getWorkBySlug(slug){
  return works.find(function(work){
    return work.slug === slug;
  });
}

export function getAreaBySlug(slug){
  return areas.find(function(area){
    return area.slug === slug;
  });
}

export function getSpotBySlug(slug){
  return spots.find(function(spot){
    return spot.slug === slug;
  });
}

export function getSpotsByWorkSlug(workSlug){
  return spots.filter(function(spot){
    return spot.workSlug === workSlug;
  });
}

export function getSpotsByAreaSlug(areaSlug){
  return spots.filter(function(spot){
    return spot.areaSlug === areaSlug;
  });
}