# ==============================================================================
# AtelierOS Revit BIM Sync Companion Script
# Compatibility: Autodesk Revit 2024 / 2025 / 2026 (via pyRevit or Dynamo)
# Purpose: Exports native Revit room polygons, material schedules, and 3D camera
#          walkthrough trajectories directly into AtelierOS and Higgsfield AI.
# ==============================================================================

import clr
import json
import urllib2

# Import Revit API
clr.AddReference('RevitAPI')
clr.AddReference('RevitAPIUI')
from Autodesk.Revit.DB import (
    FilteredElementCollector,
    BuiltInCategory,
    SpatialElementBoundaryOptions,
    SpatialElementBoundaryLocation,
    View3D,
    UnitUtils,
    UnitTypeId,
)

doc = __revit__.ActiveUIDocument.Document

def extract_revit_project():
    """Extracts project information, rooms, materials, and 3D camera views."""
    project_info = doc.ProjectInformation
    project_name = project_info.Name or "Revit Architectural Project"
    
    # 1. Collect Rooms
    room_collector = FilteredElementCollector(doc).OfCategory(BuiltInCategory.OST_Rooms).WhereElementIsNotElementType()
    options = SpatialElementBoundaryOptions()
    options.SpatialElementBoundaryLocation = SpatialElementBoundaryLocation.Center
    
    rooms_data = []
    for room in room_collector:
        if room.Area <= 0:
            continue
            
        room_name = room.LookupParameter("Name").AsString() or "Unnamed Room"
        room_num = room.LookupParameter("Number").AsString() or "0"
        
        # Convert area from sqft to sqm (internal Revit units are feet)
        area_sqm = UnitUtils.ConvertFromInternalUnits(room.Area, UnitTypeId.SquareMeters)
        perimeter_m = UnitUtils.ConvertFromInternalUnits(room.Perimeter, UnitTypeId.Meters)
        height_m = UnitUtils.ConvertFromInternalUnits(room.UnboundedHeight, UnitTypeId.Meters)
        
        # Extract room boundary polygon points
        boundary_segments = room.GetBoundarySegments(options)
        points = []
        if boundary_segments and len(boundary_segments) > 0:
            for seg in boundary_segments[0]:
                curve = seg.GetCurve()
                pt = curve.GetEndPoint(0)
                # Convert to meters
                px = UnitUtils.ConvertFromInternalUnits(pt.X, UnitTypeId.Meters)
                py = UnitUtils.ConvertFromInternalUnits(pt.Y, UnitTypeId.Meters)
                points.append([round(px, 3), round(py, 3)])
                
        rooms_data.append({
            "id": str(room.Id.IntegerValue),
            "name": room_name,
            "number": room_num,
            "areaSqM": round(area_sqm, 2),
            "perimeterM": round(perimeter_m, 2),
            "unboundedHeightM": round(height_m, 2),
            "level": room.Level.Name if room.Level else "Ground",
            "boundaryPoints": points,
            "finishSchedule": {
                "floorFinish": room.LookupParameter("Floor Finish").AsString() or "Italian Marble",
                "wallFinish": room.LookupParameter("Wall Finish").AsString() or "Asian Paints Royale Matte",
                "ceilingFinish": room.LookupParameter("Ceiling Finish").AsString() or "Gyproc SoundStop",
            }
        })
        
    # 2. Collect 3D Camera Views & Walkthroughs
    views_collector = FilteredElementCollector(doc).OfClass(View3D).WhereElementIsNotElementType()
    cameras_data = []
    
    for view in views_collector:
        if view.IsTemplate:
            continue
        if view.IsPerspective:
            try:
                eye = view.GetEyePosition()
                target = view.GetTargetPosition()
                
                eye_m = [
                    round(UnitUtils.ConvertFromInternalUnits(eye.X, UnitTypeId.Meters), 3),
                    round(UnitUtils.ConvertFromInternalUnits(eye.Y, UnitTypeId.Meters), 3),
                    round(UnitUtils.ConvertFromInternalUnits(eye.Z, UnitTypeId.Meters), 3)
                ]
                target_m = [
                    round(UnitUtils.ConvertFromInternalUnits(target.X, UnitTypeId.Meters), 3),
                    round(UnitUtils.ConvertFromInternalUnits(target.Y, UnitTypeId.Meters), 3),
                    round(UnitUtils.ConvertFromInternalUnits(target.Z, UnitTypeId.Meters), 3)
                ]
                
                cameras_data.append({
                    "viewName": view.Name,
                    "viewType": "Perspective",
                    "eyePosition": eye_m,
                    "targetPosition": target_m,
                    "fieldOfViewDeg": 55.0,
                    "focalLengthMm": 28
                })
            except Exception as e:
                pass

    payload = {
        "version": "1.0",
        "revitVersion": doc.Application.VersionName,
        "projectName": project_name,
        "units": "metric",
        "levels": [{"name": "Ground", "elevationM": 0.0}],
        "rooms": rooms_data,
        "cameras": cameras_data,
        "exportedAt": "2026-10-04T00:00:00Z"
    }
    
    return payload

def sync_to_atelieros(payload, endpoint_url="https://atelieros-cloud.vercel.app/api/integrations/revit"):
    """POSTs the extracted BIM data directly to the AtelierOS API."""
    data_json = json.dumps(payload)
    req = urllib2.Request(endpoint_url, data_json, {'Content-Type': 'application/json'})
    
    try:
        response = urllib2.urlopen(req, timeout=15)
        res_data = response.read()
        print("Successfully synced to AtelierOS: " + str(res_data))
    except Exception as err:
        print("Failed to sync to AtelierOS: " + str(err))

if __name__ == "__main__":
    bim_data = extract_revit_project()
    print("Extracted {} rooms and {} 3D cameras from Revit.".format(len(bim_data["rooms"]), len(bim_data["cameras"])))
    sync_to_atelieros(bim_data)
