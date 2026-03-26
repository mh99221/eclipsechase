import { describe, it, expect } from 'vitest'
import { bestRegion } from '../../../app/utils/weather'

// Types matching API responses
type Station = { id: string; name: string; lat: number; lng: number; region: string }
type CloudEntry = { station_id: string; cloud_cover: number | null }

describe('bestRegion', () => {
  const stations: Station[] = [
    { id: '1', name: 'S1', lat: 64, lng: -22, region: 'snaefellsnes' },
    { id: '2', name: 'S2', lat: 64, lng: -22.5, region: 'snaefellsnes' },
    { id: '3', name: 'S3', lat: 65, lng: -23, region: 'westfjords' },
    { id: '4', name: 'S4', lat: 65, lng: -23.5, region: 'westfjords' },
    { id: '5', name: 'S5', lat: 64, lng: -22, region: 'reykjavik' },
  ]

  it('picks the region with lowest average cloud cover', () => {
    const cloud: CloudEntry[] = [
      { station_id: '1', cloud_cover: 10 },
      { station_id: '2', cloud_cover: 20 },
      { station_id: '3', cloud_cover: 50 },
      { station_id: '4', cloud_cover: 60 },
      { station_id: '5', cloud_cover: 40 },
    ]
    const result = bestRegion(stations, cloud)
    expect(result).not.toBeNull()
    expect(result!.region).toBe('snaefellsnes')
    expect(result!.avgCloudCover).toBe(15)
  })

  it('excludes stations with null cloud cover from averages', () => {
    const cloud: CloudEntry[] = [
      { station_id: '1', cloud_cover: null },
      { station_id: '2', cloud_cover: 30 },
      { station_id: '3', cloud_cover: 20 },
      { station_id: '4', cloud_cover: 20 },
      { station_id: '5', cloud_cover: 50 },
    ]
    const result = bestRegion(stations, cloud)
    expect(result!.region).toBe('westfjords')
    expect(result!.avgCloudCover).toBe(20)
  })

  it('returns null when cloud data is empty', () => {
    expect(bestRegion(stations, [])).toBeNull()
  })

  it('returns null when stations is empty', () => {
    const cloud: CloudEntry[] = [{ station_id: '1', cloud_cover: 10 }]
    expect(bestRegion([], cloud)).toBeNull()
  })

  it('skips regions where all stations have null cloud cover', () => {
    const cloud: CloudEntry[] = [
      { station_id: '1', cloud_cover: null },
      { station_id: '2', cloud_cover: null },
      { station_id: '3', cloud_cover: 30 },
      { station_id: '4', cloud_cover: 40 },
      { station_id: '5', cloud_cover: 50 },
    ]
    const result = bestRegion(stations, cloud)
    expect(result!.region).toBe('westfjords')
  })

  it('rounds avgCloudCover to nearest integer', () => {
    const cloud: CloudEntry[] = [
      { station_id: '1', cloud_cover: 10 },
      { station_id: '2', cloud_cover: 11 },
      { station_id: '3', cloud_cover: 90 },
      { station_id: '4', cloud_cover: 90 },
      { station_id: '5', cloud_cover: 90 },
    ]
    const result = bestRegion(stations, cloud)
    expect(result!.avgCloudCover).toBe(11) // 10.5 rounds to 11
  })
})
